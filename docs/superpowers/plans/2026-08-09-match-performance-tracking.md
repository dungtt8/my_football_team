# Match Performance Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members who checked in "yes" to a match session self-report goals/assists (subject to manager approval), and let managers record the official match score — both attached to the existing `attendance_sessions` row used for check-in.

**Architecture:** Extend the existing `attendance_sessions` table with score columns (1:1 relationship, no join needed) and add one new table `match_performances` (1 row per member per match) with a pending/approved/rejected lifecycle. Approval awards points through the existing `user_points` ledger via `gamificationService.addPoints`. All new backend code follows the existing handler → service → knex-query-builder layering already used by `attendanceHandler`/`checkinService`. Frontend adds one new self-contained component rendered inline on the existing session detail page — no new routes.

**Tech Stack:** Node/Express + Knex (Postgres) backend, Next.js App Router + React frontend, no new dependencies.

## Global Constraints

- Feature only activates when `attendance_sessions.session_type === 'match'`.
- Only members whose `attendance_checkins.response === 'yes'` for that session may submit performance stats for it.
- Tracked stats: `goals`, `assists` only (per spec — no other stat types).
- Points: `goals*2 + assists*1`, awarded only while a row's `status === 'approved'`; hardcoded constants, not team-configurable.
- Per project convention (`CLAUDE.md`): **do not write automated test files.** Every task is verified manually (curl for backend, browser click-through for frontend) instead of via a test suite.
- Per project convention (`CLAUDE.md`): keep implementation simple — no extra abstraction beyond what's specified below.
- Follow existing patterns exactly: Knex migrations (`exports.up`/`exports.down`), `rbacMiddleware(['role',...])` on routes, `handleError(error, req, res, {endpoint})` in handler catch blocks, `ValidationError`/`NotFoundError` from `backend/src/services/errorService.js` for domain errors.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/src/database/migrations/015_match_performances.js` | New migration: adds score columns to `attendance_sessions`, creates `match_performances` table |
| `backend/src/services/gamificationService.js` (modify) | `addPoints` gains an optional 5th `sessionId` param so ledger entries can be tied to a session |
| `backend/src/services/matchPerformanceService.js` (new) | All DB/business logic: list, submit, review, set result, points math |
| `backend/src/handlers/matchPerformanceHandler.js` (new) | Thin HTTP layer over the service, following `attendanceHandler.js` conventions |
| `backend/src/app.js` (modify) | Register 4 new routes |
| `frontend/hooks/useAttendance.ts` (modify) | Add `MatchPerformance` type, extend `AttendanceSession`, add 4 new hook methods |
| `frontend/components/Attendance/MatchPerformancePanel.tsx` (new) | Self-contained UI: match result card + personal/team performance list |
| `frontend/app/app/attendance/sessions/[id]/page.tsx` (modify) | Render `<MatchPerformancePanel>` when `isMatch` |

---

### Task 1: Database migration

**Files:**
- Create: `backend/src/database/migrations/015_match_performances.js`

**Interfaces:**
- Produces: table `attendance_sessions` gains columns `home_score` (integer, nullable), `away_score` (integer, nullable), `result_recorded_by` (bigint FK → users.id, nullable), `result_recorded_at` (timestamp, nullable).
- Produces: new table `match_performances` with columns `id, session_id, user_id, team_id, goals, assists, status, submitted_at, reviewed_by, reviewed_at, created_at, updated_at`, unique on `(session_id, user_id)`.

- [ ] **Step 1: Write the migration**

```js
/**
 * Migration 015: Match performance tracking
 *
 * Adds a match result (score) to attendance_sessions, and a new
 * match_performances table for members to self-report goals/assists
 * on a match session, subject to manager approval.
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.integer('home_score').nullable();
        table.integer('away_score').nullable();
        table.bigInteger('result_recorded_by').nullable().references('id').inTable('users');
        table.timestamp('result_recorded_at').nullable();
    });

    await knex.schema.createTable('match_performances', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('session_id').notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.integer('goals').notNullable().defaultTo(0);
        table.integer('assists').notNullable().defaultTo(0);
        table.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
        table.timestamp('submitted_at').nullable();
        table.bigInteger('reviewed_by').nullable().references('id').inTable('users');
        table.timestamp('reviewed_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique(['session_id', 'user_id']);
        table.index(['team_id', 'session_id']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('match_performances');
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.dropColumn('home_score');
        table.dropColumn('away_score');
        table.dropColumn('result_recorded_by');
        table.dropColumn('result_recorded_at');
    });
};
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && npx knex migrate:latest`
Expected: output includes `Batch N run: 1 migrations` and lists `015_match_performances.js`.

- [ ] **Step 3: Verify the schema manually**

Run: `cd backend && npx knex migrate:currentVersion` — expect `015_match_performances.js`.
Then inspect via psql (use whatever DB connection the project already uses, e.g. `psql $DATABASE_URL -c "\d match_performances"` and `psql $DATABASE_URL -c "\d attendance_sessions"`) and confirm the new columns/table exist with the types above.

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/migrations/015_match_performances.js
git commit -m "feat: add match_performances table and session score columns"
```

---

### Task 2: Extend `gamificationService.addPoints` with an optional session id

**Files:**
- Modify: `backend/src/services/gamificationService.js:26-53` (the `addPoints` method)

**Interfaces:**
- Produces: `addPoints(userId, points, reason, teamId, sessionId = null)` — existing 4-arg call sites are unaffected (`sessionId` defaults to `null`, matching the nullable `user_points.session_id` column already in the schema).

- [ ] **Step 1: Edit the method signature and insert call**

Change:
```js
  async addPoints(userId, points, reason, teamId) {
    try {
      const month = this.getCurrentMonth();

      const result = await db('user_points').insert({
        user_id: userId,
        team_id: teamId,
        points,
        reason,
        month,
        created_at: db.fn.now()
      }).returning('*');
```
to:
```js
  async addPoints(userId, points, reason, teamId, sessionId = null) {
    try {
      const month = this.getCurrentMonth();

      const result = await db('user_points').insert({
        user_id: userId,
        team_id: teamId,
        points,
        reason,
        month,
        session_id: sessionId,
        created_at: db.fn.now()
      }).returning('*');
```

- [ ] **Step 2: Verify no other call site breaks**

Run: `grep -rn "gamificationService.addPoints(" backend/src` and confirm every call site still passes 4 positional args (they will still work since the 5th is optional/defaulted).

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/gamificationService.js
git commit -m "feat: let addPoints tie a ledger entry to a session"
```

---

### Task 3: `matchPerformanceService.js`

**Files:**
- Create: `backend/src/services/matchPerformanceService.js`

**Interfaces:**
- Consumes: `db` from `../config/database` (knex instance, same as `checkinService.js`), `gamificationService.addPoints(userId, points, reason, teamId, sessionId)` from Task 2, `ValidationError`/`NotFoundError` from `../services/errorService`.
- Produces (used by Task 4's handler):
  - `getPerformancesForSession(sessionId, teamId): Promise<Array<{id, user_id, goals, assists, status, submitted_at, reviewed_by, reviewed_at, full_name, email}>>`
  - `submitOwnPerformance(sessionId, userId, teamId, {goals, assists}): Promise<row>`
  - `reviewPerformance(sessionId, targetUserId, reviewerId, teamId, {goals, assists, status}): Promise<row>`
  - `setMatchResult(sessionId, teamId, reviewerId, {home_score, away_score}): Promise<sessionRow>`
  - `computePoints(goals, assists): number` (exported for the handler's own input validation reuse if ever needed — not required to import it elsewhere in this plan)

- [ ] **Step 1: Write the service**

```js
/**
 * matchPerformanceService — self-reported goals/assists for match sessions,
 * subject to manager approval, plus manager-recorded match result (score).
 *
 * Points: goals*2 + assists*1, awarded via the shared user_points ledger
 * (gamificationService.addPoints) only while a row's status is 'approved'.
 * Editing an already-approved row (or moving it back to pending/rejected)
 * adjusts the ledger by the delta between the newly-desired total and
 * whatever was previously awarded for that (session, user) pair, so the
 * full history stays in the ledger instead of being overwritten.
 */
const db = require('../config/database');
const gamificationService = require('./gamificationService');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('./errorService');

const GOAL_POINTS = 2;
const ASSIST_POINTS = 1;
const LEDGER_REASONS = ['match_performance', 'match_performance_adjustment', 'match_performance_revoked'];

function computePoints(goals, assists) {
    return goals * GOAL_POINTS + assists * ASSIST_POINTS;
}

async function getMatchSessionOrThrow(sessionId, teamId, trx = db) {
    const session = await trx('attendance_sessions')
        .where({ id: sessionId, team_id: teamId })
        .first();
    if (!session) throw new NotFoundError('Session', sessionId);
    if (session.session_type !== 'match')
        throw new ValidationError('Match performance tracking only applies to match sessions');
    return session;
}

/**
 * List every performance row for a session, joined with the member's name.
 * Visible to any team member (mirrors checkinService.getSessionCheckins).
 */
async function getPerformancesForSession(sessionId, teamId) {
    return db('match_performances as mp')
        .join('users as u', 'u.id', 'mp.user_id')
        .where('mp.session_id', sessionId)
        .where('mp.team_id', teamId)
        .select(
            'mp.id', 'mp.user_id', 'mp.goals', 'mp.assists', 'mp.status',
            'mp.submitted_at', 'mp.reviewed_by', 'mp.reviewed_at',
            'u.full_name', 'u.email',
        )
        .orderBy('u.full_name');
}

/**
 * Member creates/updates their own performance row. Only allowed while the
 * session is a match, the caller checked in 'yes', and their existing row
 * (if any) isn't already approved. Always resets status to 'pending' —
 * even a resubmit after a rejection goes back through manager review.
 */
async function submitOwnPerformance(sessionId, userId, teamId, { goals, assists }) {
    await getMatchSessionOrThrow(sessionId, teamId);

    const checkin = await db('attendance_checkins')
        .where({ session_id: sessionId, user_id: userId, team_id: teamId, response: 'yes' })
        .first();
    if (!checkin)
        throw new ValidationError('Only members who checked in as attending can log match performance');

    const existing = await db('match_performances')
        .where({ session_id: sessionId, user_id: userId })
        .first();

    if (existing && existing.status === 'approved')
        throw new ValidationError('This entry is already approved — ask a manager to edit it');

    const now = new Date();
    if (existing) {
        await db('match_performances')
            .where({ id: existing.id })
            .update({ goals, assists, status: 'pending', submitted_at: now, updated_at: now });
        return db('match_performances').where({ id: existing.id }).first();
    }

    const [row] = await db('match_performances').insert({
        session_id: sessionId,
        user_id: userId,
        team_id: teamId,
        goals,
        assists,
        status: 'pending',
        submitted_at: now,
        created_at: now,
        updated_at: now,
    }).returning('*');

    logger.info('Match performance submitted', { session_id: sessionId, user_id: userId, goals, assists });
    return row;
}

/**
 * Manager sets goals/assists/status on any member's row and reconciles the
 * points ledger to match. Locking the row (forUpdate) prevents a race with
 * a concurrent review of the same row.
 */
async function reviewPerformance(sessionId, targetUserId, reviewerId, teamId, { goals, assists, status }) {
    await getMatchSessionOrThrow(sessionId, teamId);

    return db.transaction(async (trx) => {
        const row = await trx('match_performances')
            .where({ session_id: sessionId, user_id: targetUserId, team_id: teamId })
            .forUpdate()
            .first();
        if (!row) throw new NotFoundError('Performance entry', `${sessionId}/${targetUserId}`);

        const newGoals = goals !== undefined ? goals : row.goals;
        const newAssists = assists !== undefined ? assists : row.assists;
        const now = new Date();

        await trx('match_performances')
            .where({ id: row.id })
            .update({
                goals: newGoals,
                assists: newAssists,
                status,
                reviewed_by: reviewerId,
                reviewed_at: now,
                updated_at: now,
            });

        const priorAwarded = await trx('user_points')
            .where({ session_id: sessionId, user_id: targetUserId, team_id: teamId })
            .whereIn('reason', LEDGER_REASONS)
            .sum('points as total')
            .first();
        const priorTotal = Number(priorAwarded?.total || 0);

        const desiredTotal = status === 'approved' ? computePoints(newGoals, newAssists) : 0;
        const delta = desiredTotal - priorTotal;

        if (delta !== 0) {
            const reason = priorTotal === 0
                ? 'match_performance'
                : desiredTotal === 0
                    ? 'match_performance_revoked'
                    : 'match_performance_adjustment';
            await gamificationService.addPoints(targetUserId, delta, reason, teamId, sessionId);
        }

        logger.info('Match performance reviewed', {
            session_id: sessionId, user_id: targetUserId, status, delta,
        });

        return trx('match_performances').where({ id: row.id }).first();
    });
}

/**
 * Manager records the official score for a match session.
 */
async function setMatchResult(sessionId, teamId, reviewerId, { home_score, away_score }) {
    await getMatchSessionOrThrow(sessionId, teamId);

    if (!Number.isInteger(home_score) || home_score < 0)
        throw new ValidationError('home_score must be a non-negative integer');
    if (!Number.isInteger(away_score) || away_score < 0)
        throw new ValidationError('away_score must be a non-negative integer');

    const now = new Date();
    const [updated] = await db('attendance_sessions')
        .where({ id: sessionId })
        .update({
            home_score,
            away_score,
            result_recorded_by: reviewerId,
            result_recorded_at: now,
            updated_at: now,
        })
        .returning('*');

    logger.info('Match result recorded', { session_id: sessionId, home_score, away_score });
    return updated;
}

module.exports = {
    computePoints,
    getPerformancesForSession,
    submitOwnPerformance,
    reviewPerformance,
    setMatchResult,
};
```

- [ ] **Step 2: Verify it loads without syntax errors**

Run: `cd backend && node -e "require('./src/services/matchPerformanceService.js'); console.log('OK')"`
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/matchPerformanceService.js
git commit -m "feat: add matchPerformanceService for goals/assists and match results"
```

---

### Task 4: `matchPerformanceHandler.js`

**Files:**
- Create: `backend/src/handlers/matchPerformanceHandler.js`

**Interfaces:**
- Consumes: all four functions from `matchPerformanceService.js` (Task 3), `ValidationError`/`handleError` from `../services/errorService`.
- Produces: `{ listPerformances, submitMyPerformance, reviewPerformance, setMatchResult }`, each an Express `(req, res)` handler, for Task 5's route wiring.

- [ ] **Step 1: Write the handler**

```js
const matchPerformanceService = require('../services/matchPerformanceService');
const { ValidationError, handleError } = require('../services/errorService');

/**
 * GET /api/attendance/sessions/:id/performance
 * Visible to any team member.
 */
const listPerformances = async (req, res) => {
    try {
        const { id } = req.params;
        const teamId = req.team.id;
        const performances = await matchPerformanceService.getPerformancesForSession(id, teamId);
        return res.json({ session_id: id, performances });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/sessions/:id/performance' });
    }
};

/**
 * POST /api/attendance/sessions/:id/performance
 * Body: { goals, assists }
 * Member submits/updates their own performance for the match.
 */
const submitMyPerformance = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const teamId = req.team.id;
        const { goals, assists } = req.body;

        if (!Number.isInteger(goals) || goals < 0)
            throw new ValidationError('goals must be a non-negative integer');
        if (!Number.isInteger(assists) || assists < 0)
            throw new ValidationError('assists must be a non-negative integer');

        const result = await matchPerformanceService.submitOwnPerformance(id, userId, teamId, { goals, assists });
        return res.json(result);
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/attendance/sessions/:id/performance' });
    }
};

/**
 * PATCH /api/attendance/sessions/:id/performance/:userId
 * Body: { goals?, assists?, status: 'approved' | 'rejected' | 'pending' }
 * Manager reviews/edits a specific member's performance.
 */
const reviewPerformance = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const reviewerId = req.user.id;
        const teamId = req.team.id;
        const { goals, assists, status } = req.body;

        if (goals !== undefined && (!Number.isInteger(goals) || goals < 0))
            throw new ValidationError('goals must be a non-negative integer');
        if (assists !== undefined && (!Number.isInteger(assists) || assists < 0))
            throw new ValidationError('assists must be a non-negative integer');
        if (!['approved', 'rejected', 'pending'].includes(status))
            throw new ValidationError('status must be "approved", "rejected", or "pending"');

        const result = await matchPerformanceService.reviewPerformance(id, userId, reviewerId, teamId, { goals, assists, status });
        return res.json(result);
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PATCH /api/attendance/sessions/:id/performance/:userId' });
    }
};

/**
 * PUT /api/attendance/sessions/:id/result
 * Body: { home_score, away_score }
 * Manager records the official match score.
 */
const setMatchResult = async (req, res) => {
    try {
        const { id } = req.params;
        const reviewerId = req.user.id;
        const teamId = req.team.id;
        const { home_score, away_score } = req.body;

        const result = await matchPerformanceService.setMatchResult(id, teamId, reviewerId, { home_score, away_score });
        return res.json(result);
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PUT /api/attendance/sessions/:id/result' });
    }
};

module.exports = { listPerformances, submitMyPerformance, reviewPerformance, setMatchResult };
```

- [ ] **Step 2: Verify it loads without syntax errors**

Run: `cd backend && node -e "require('./src/handlers/matchPerformanceHandler.js'); console.log('OK')"`
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/handlers/matchPerformanceHandler.js
git commit -m "feat: add matchPerformanceHandler HTTP layer"
```

---

### Task 5: Wire routes in `app.js`

**Files:**
- Modify: `backend/src/app.js:162` (immediately after the existing `checkinHandler.getCheckInStats` route line)

**Interfaces:**
- Consumes: `matchPerformanceHandler` exports from Task 4, existing `rbacMiddleware` from `./middleware/rbacMiddleware`.

- [ ] **Step 1: Insert the new route block**

Find this exact line in `backend/src/app.js`:
```js
app.get('/api/attendance/sessions/:sessionId/checkin-stats', rbacMiddleware(['member', 'co_manager', 'owner']), checkinHandler.getCheckInStats);
```
Insert immediately after it:
```js

// ── Match performance (goals/assists + result) ───────────────────────────────
const matchPerformanceHandler = require('./handlers/matchPerformanceHandler');
app.get('/api/attendance/sessions/:id/performance', rbacMiddleware(['member', 'co_manager', 'owner']), matchPerformanceHandler.listPerformances);
app.post('/api/attendance/sessions/:id/performance', rbacMiddleware(['member', 'co_manager', 'owner']), matchPerformanceHandler.submitMyPerformance);
app.patch('/api/attendance/sessions/:id/performance/:userId', rbacMiddleware(['co_manager', 'owner']), matchPerformanceHandler.reviewPerformance);
app.put('/api/attendance/sessions/:id/result', rbacMiddleware(['co_manager', 'owner']), matchPerformanceHandler.setMatchResult);
```

- [ ] **Step 2: Start the backend and verify it boots**

Run: `cd backend && npm run dev` (or however the dev server is normally started in this project — check for an existing running instance first via `lsof -i :3001` since one may already be up)
Expected: server starts with no "Cannot find module" or route-registration errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.js
git commit -m "feat: register match performance and result routes"
```

---

### Task 6: Manual API verification (backend end-to-end, no UI yet)

**Files:** none (verification only)

**Interfaces:** none produced — this task exists to catch integration bugs across Tasks 1–5 before building the UI on top of them.

- [ ] **Step 1: Log in and capture an auth token/cookie**

Use whatever the project's existing login flow is (check `backend/src/handlers/phoneAuthHandler.js` for the exact request shape) to obtain a session for a manager (`co_manager`/`owner`) account and a separate member account. Record however this backend expects the token to be sent (Authorization header or cookie — check `authMiddleware.js` if unsure).

- [ ] **Step 2: Create a match session as the manager**

```bash
curl -s -X POST http://localhost:3001/api/attendance/sessions \
  -H "Content-Type: application/json" -H "<auth header>" \
  -d '{"session_date":"2026-08-11T20:30:00Z","session_type":"match","location":"Test pitch"}'
```
Expected: `201` with the session JSON; note its `id`.

- [ ] **Step 3: Member checks in "yes"**

Get the member's active checkin id via `GET /api/attendance/checkin/active` (as the member), then:
```bash
curl -s -X POST http://localhost:3001/api/attendance/checkin/<checkinId>/respond \
  -H "Content-Type: application/json" -H "<member auth header>" \
  -d '{"response":"yes"}'
```
Expected: `200` with `response: "yes"`.

- [ ] **Step 4: Member submits performance**

```bash
curl -s -X POST http://localhost:3001/api/attendance/sessions/<sessionId>/performance \
  -H "Content-Type: application/json" -H "<member auth header>" \
  -d '{"goals":2,"assists":1}'
```
Expected: `200`, `status: "pending"`.

- [ ] **Step 5: Confirm a non-checked-in member is rejected**

Repeat step 4 with an account that has not responded "yes" to this session.
Expected: `400` with a message mentioning "checked in as attending".

- [ ] **Step 6: Manager approves and points land in the ledger**

```bash
curl -s -X PATCH http://localhost:3001/api/attendance/sessions/<sessionId>/performance/<memberUserId> \
  -H "Content-Type: application/json" -H "<manager auth header>" \
  -d '{"status":"approved"}'
```
Expected: `200`, `status: "approved"`. Then `GET /api/attendance/stats/<memberUserId>` and confirm `total_points` increased by `2*2 + 1*1 = 5` relative to before this task's steps.

- [ ] **Step 7: Manager edits an already-approved entry and points adjust**

```bash
curl -s -X PATCH http://localhost:3001/api/attendance/sessions/<sessionId>/performance/<memberUserId> \
  -H "Content-Type: application/json" -H "<manager auth header>" \
  -d '{"goals":3,"assists":1,"status":"approved"}'
```
Expected: `200`. `total_points` should have increased by exactly `2` more (new total 3*2+1=7 vs prior 5, delta 2) — confirm via `GET /api/attendance/stats/<memberUserId>` again.

- [ ] **Step 8: Manager sets the match result**

```bash
curl -s -X PUT http://localhost:3001/api/attendance/sessions/<sessionId>/result \
  -H "Content-Type: application/json" -H "<manager auth header>" \
  -d '{"home_score":5,"away_score":3}'
```
Expected: `200` with `home_score: 5, away_score: 3`. Then `GET /api/attendance/sessions/<sessionId>` and confirm the session object includes those same values.

- [ ] **Step 9: Confirm a training session rejects both endpoints**

Create a `session_type: "training"` session and repeat steps 4 and 8 against it.
Expected: both return `400` with a message mentioning "match sessions".

No commit for this task (verification only, no file changes). If any step fails, fix the relevant Task 1–5 file and re-run from Step 1.

---

### Task 7: Extend `useAttendance.ts`

**Files:**
- Modify: `frontend/hooks/useAttendance.ts`

**Interfaces:**
- Produces:
  - `MatchPerformance` type: `{id, session_id, user_id, goals, assists, status: 'pending'|'approved'|'rejected', submitted_at, reviewed_by, reviewed_at, full_name?, email?}`
  - `AttendanceSession` gains `home_score, away_score, result_recorded_by, result_recorded_at` (all `number | null` except the timestamp which is `string | null`)
  - New hook methods: `getMatchPerformances(sessionId): Promise<MatchPerformance[]>`, `submitMyPerformance(sessionId, {goals, assists}): Promise<MatchPerformance>`, `reviewPerformance(sessionId, userId, {goals?, assists?, status}): Promise<MatchPerformance>`, `setMatchResult(sessionId, {home_score, away_score}): Promise<AttendanceSession>`
- Consumes: existing `request` from `useApi()` (already imported in this file).

- [ ] **Step 1: Extend the `AttendanceSession` interface**

In `frontend/hooks/useAttendance.ts`, find:
```ts
export interface AttendanceSession {
    id: string
    team_id: string
    created_by: string | null
    session_date: string
    check_in_deadline: string | null
    location: string | null
    session_type: 'training' | 'match'
    description: string | null
    status: 'active' | 'closed'
    closed_at: string | null
    created_at: string
    updated_at: string
}
```
Replace with:
```ts
export interface AttendanceSession {
    id: string
    team_id: string
    created_by: string | null
    session_date: string
    check_in_deadline: string | null
    location: string | null
    session_type: 'training' | 'match'
    description: string | null
    status: 'active' | 'closed'
    closed_at: string | null
    home_score: number | null
    away_score: number | null
    result_recorded_by: string | null
    result_recorded_at: string | null
    created_at: string
    updated_at: string
}
```

- [ ] **Step 2: Add the `MatchPerformance` interface**

Directly below the `AttendanceHistory` interface (after the line `export interface AttendanceHistory { ... }` block, before the `// ── Hook ──` comment), add:
```ts
export interface MatchPerformance {
    id: string
    session_id: string
    user_id: string
    goals: number
    assists: number
    status: 'pending' | 'approved' | 'rejected'
    submitted_at: string | null
    reviewed_by: string | null
    reviewed_at: string | null
    full_name?: string
    email?: string
}
```

- [ ] **Step 3: Add the four hook methods**

Directly below the `remindSession` method (right before the `// ── Checkin responses ──` comment), add:
```ts
    const getMatchPerformances = useCallback(async (id: string) => {
        try {
            setLocalError(null)
            const res = await request<{ session_id: string; performances: MatchPerformance[] }>(`/attendance/sessions/${id}/performance`, 'GET')
            return res?.performances || []
        } catch (err) {
            setLocalError(err instanceof Error ? err : new Error('Failed to fetch performances'))
            return []
        }
    }, [request])

    const submitMyPerformance = useCallback(async (id: string, data: { goals: number; assists: number }) => {
        try {
            setLocalError(null)
            return await request<MatchPerformance>(`/attendance/sessions/${id}/performance`, 'POST', data)
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to submit performance')
            setLocalError(e); throw e
        }
    }, [request])

    const reviewPerformance = useCallback(async (id: string, userId: string, data: { goals?: number; assists?: number; status: 'approved' | 'rejected' | 'pending' }) => {
        try {
            setLocalError(null)
            return await request<MatchPerformance>(`/attendance/sessions/${id}/performance/${userId}`, 'PATCH', data)
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to review performance')
            setLocalError(e); throw e
        }
    }, [request])

    const setMatchResult = useCallback(async (id: string, data: { home_score: number; away_score: number }) => {
        try {
            setLocalError(null)
            return await request<AttendanceSession>(`/attendance/sessions/${id}/result`, 'PUT', data)
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to set match result')
            setLocalError(e); throw e
        }
    }, [request])

```

- [ ] **Step 4: Export the four new methods**

In the `return { ... }` block at the end of `useAttendance`, find:
```ts
        remindSession,
        getActiveCheckin,
```
Replace with:
```ts
        remindSession,
        getMatchPerformances,
        submitMyPerformance,
        reviewPerformance,
        setMatchResult,
        getActiveCheckin,
```

- [ ] **Step 5: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p .`
Expected: no new errors referencing `useAttendance.ts`.

- [ ] **Step 6: Commit**

```bash
git add frontend/hooks/useAttendance.ts
git commit -m "feat: add match performance methods to useAttendance hook"
```

---

### Task 8: `MatchPerformancePanel.tsx` component

**Files:**
- Create: `frontend/components/Attendance/MatchPerformancePanel.tsx`

**Interfaces:**
- Consumes: `useAttendance()` (specifically `getMatchPerformances`, `submitMyPerformance`, `reviewPerformance`, `setMatchResult`), `useToast()` from `@/hooks/useToast`, `MatchPerformance`/`AttendanceCheckin` types from `@/hooks/useAttendance`.
- Props:
```ts
interface MatchPerformancePanelProps {
    sessionId: string
    isManager: boolean
    currentUserId?: string
    myCheckinResponse: 'yes' | 'no' | null | undefined
    homeScore: number | null
    awayScore: number | null
    sessionActive: boolean
    onResultUpdated: (updates: { home_score: number; away_score: number }) => void
}
```
- Produces: default export `MatchPerformancePanel` — a React component, consumed by Task 9.

- [ ] **Step 1: Write the component**

```tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAttendance, MatchPerformance } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'

const G = {
    glass: '#FFFFFF',
    glassBorder: '#E7ECF3',
    accent: '#12B76A',
    accentDim: 'rgba(18,183,106,0.12)',
    red: '#F04438',
    redDim: 'rgba(240,68,56,0.12)',
    yellow: '#F5A623',
    yellowDim: 'rgba(245,166,35,0.12)',
    t1: '#0B1220',
    t2: 'rgba(11,18,32,0.55)',
    t3: 'rgba(11,18,32,0.30)',
}

const STATUS_LABEL: Record<MatchPerformance['status'], string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
}
const STATUS_COLOR: Record<MatchPerformance['status'], { fg: string; bg: string; border: string }> = {
    pending: { fg: G.yellow, bg: G.yellowDim, border: 'rgba(245,166,35,0.25)' },
    approved: { fg: G.accent, bg: G.accentDim, border: 'rgba(18,183,106,0.25)' },
    rejected: { fg: G.red, bg: G.redDim, border: 'rgba(240,68,56,0.25)' },
}

interface MatchPerformancePanelProps {
    sessionId: string
    isManager: boolean
    currentUserId?: string
    myCheckinResponse: 'yes' | 'no' | null | undefined
    homeScore: number | null
    awayScore: number | null
    sessionActive: boolean
    onResultUpdated: (updates: { home_score: number; away_score: number }) => void
}

export default function MatchPerformancePanel({
    sessionId, isManager, currentUserId, myCheckinResponse,
    homeScore, awayScore, sessionActive, onResultUpdated,
}: MatchPerformancePanelProps) {
    const { getMatchPerformances, submitMyPerformance, reviewPerformance, setMatchResult } = useAttendance()
    const { toast } = useToast()

    const [performances, setPerformances] = useState<MatchPerformance[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [myGoals, setMyGoals] = useState('0')
    const [myAssists, setMyAssists] = useState('0')
    const [isSubmittingMine, setIsSubmittingMine] = useState(false)
    const [reviewingId, setReviewingId] = useState<string | null>(null)
    const [showResultForm, setShowResultForm] = useState(false)
    const [homeInput, setHomeInput] = useState(String(homeScore ?? 0))
    const [awayInput, setAwayInput] = useState(String(awayScore ?? 0))
    const [isSavingResult, setIsSavingResult] = useState(false)

    const load = useCallback(async () => {
        setIsLoading(true)
        const list = await getMatchPerformances(sessionId)
        setPerformances(list)
        const mine = list.find(p => p.user_id === currentUserId)
        if (mine) { setMyGoals(String(mine.goals)); setMyAssists(String(mine.assists)) }
        setIsLoading(false)
    }, [sessionId, currentUserId, getMatchPerformances])

    useEffect(() => { load() }, [load])

    const myEntry = performances.find(p => p.user_id === currentUserId)
    const myEntryLocked = myEntry?.status === 'approved'

    const handleSubmitMine = async () => {
        setIsSubmittingMine(true)
        try {
            await submitMyPerformance(sessionId, { goals: Number(myGoals) || 0, assists: Number(myAssists) || 0 })
            toast('Đã gửi thành tích, chờ quản lý duyệt', 'success')
            load()
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi gửi thành tích', 'error')
        } finally {
            setIsSubmittingMine(false)
        }
    }

    const handleReview = async (userId: string, status: 'approved' | 'rejected', goals: number, assists: number) => {
        setReviewingId(userId)
        try {
            await reviewPerformance(sessionId, userId, { goals, assists, status })
            toast(status === 'approved' ? 'Đã duyệt thành tích' : 'Đã từ chối thành tích', 'success')
            load()
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi duyệt thành tích', 'error')
        } finally {
            setReviewingId(null)
        }
    }

    const handleSaveResult = async () => {
        setIsSavingResult(true)
        try {
            const home_score = Number(homeInput) || 0
            const away_score = Number(awayInput) || 0
            await setMatchResult(sessionId, { home_score, away_score })
            toast('Đã cập nhật tỷ số trận đấu', 'success')
            onResultUpdated({ home_score, away_score })
            setShowResultForm(false)
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi cập nhật tỷ số', 'error')
        } finally {
            setIsSavingResult(false)
        }
    }

    const hasResult = homeScore !== null && awayScore !== null

    return (
        <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Block A — Kết quả trận đấu */}
            <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    Kết quả trận đấu
                </p>
                {hasResult ? (
                    <p style={{ fontSize: '20px', fontWeight: 800, color: G.t1, margin: 0 }}>
                        Đội mình {homeScore} - {awayScore} Đối thủ
                    </p>
                ) : (
                    <p style={{ fontSize: '14px', color: G.t3, margin: 0 }}>Chưa cập nhật kết quả</p>
                )}
                {isManager && sessionActive && (
                    showResultForm ? (
                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="number" min={0} value={homeInput} onChange={e => setHomeInput(e.target.value)}
                                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '16px', textAlign: 'center' }} />
                                <span style={{ color: G.t3, fontWeight: 700 }}>-</span>
                                <input type="number" min={0} value={awayInput} onChange={e => setAwayInput(e.target.value)}
                                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '16px', textAlign: 'center' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleSaveResult} disabled={isSavingResult} style={{
                                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    background: G.accent, color: '#fff', fontWeight: 700, fontSize: '13px', opacity: isSavingResult ? 0.6 : 1,
                                }}>{isSavingResult ? 'Đang lưu...' : 'Lưu tỷ số'}</button>
                                <button onClick={() => setShowResultForm(false)} style={{
                                    flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
                                    background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t2, fontWeight: 600, fontSize: '13px',
                                }}>Hủy</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowResultForm(true)} style={{
                            marginTop: '12px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', background: G.glass, color: G.t1, border: `1px solid ${G.glassBorder}`,
                        }}>{hasResult ? 'Sửa tỷ số' : 'Nhập tỷ số'}</button>
                    )
                )}
            </div>

            {/* Block B — Thành tích cá nhân */}
            <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
                    Thành tích cá nhân
                </p>

                {myCheckinResponse === 'yes' && (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${G.glassBorder}` }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', color: G.t3, display: 'block', marginBottom: '4px' }}>Bàn thắng</label>
                                <input type="number" min={0} value={myGoals} disabled={myEntryLocked}
                                    onChange={e => setMyGoals(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '15px', boxSizing: 'border-box', opacity: myEntryLocked ? 0.6 : 1 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', color: G.t3, display: 'block', marginBottom: '4px' }}>Kiến tạo</label>
                                <input type="number" min={0} value={myAssists} disabled={myEntryLocked}
                                    onChange={e => setMyAssists(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '15px', boxSizing: 'border-box', opacity: myEntryLocked ? 0.6 : 1 }} />
                            </div>
                            {myEntry && (
                                <span style={{
                                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
                                    background: STATUS_COLOR[myEntry.status].bg, color: STATUS_COLOR[myEntry.status].fg,
                                    border: `1px solid ${STATUS_COLOR[myEntry.status].border}`,
                                }}>{STATUS_LABEL[myEntry.status]}</span>
                            )}
                        </div>
                        {!myEntryLocked && (
                            <button onClick={handleSubmitMine} disabled={isSubmittingMine} style={{
                                width: '100%', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                background: G.accent, color: '#fff', fontWeight: 700, fontSize: '13px', opacity: isSubmittingMine ? 0.6 : 1,
                            }}>{isSubmittingMine ? 'Đang gửi...' : (myEntry ? 'Cập nhật thành tích' : 'Gửi thành tích')}</button>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <p style={{ fontSize: '13px', color: G.t3 }}>Đang tải...</p>
                ) : performances.length === 0 ? (
                    <p style={{ fontSize: '13px', color: G.t3 }}>Chưa có ai khai thành tích</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {performances.map(p => (
                            <div key={p.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap',
                                padding: '10px 14px', background: '#F8FAFC', border: `1px solid ${G.glassBorder}`, borderRadius: '12px',
                            }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: G.t1 }}>{p.full_name || p.email}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: G.t2 }}>⚽ {p.goals} bàn · 🅰️ {p.assists} kiến tạo</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                                        background: STATUS_COLOR[p.status].bg, color: STATUS_COLOR[p.status].fg,
                                        border: `1px solid ${STATUS_COLOR[p.status].border}`,
                                    }}>{STATUS_LABEL[p.status]}</span>
                                    {isManager && p.status === 'pending' && (
                                        <>
                                            <button disabled={reviewingId === p.user_id}
                                                onClick={() => handleReview(p.user_id, 'approved', p.goals, p.assists)}
                                                style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', background: G.accentDim, color: G.accent, border: `1px solid rgba(18,183,106,0.25)` }}>
                                                Duyệt
                                            </button>
                                            <button disabled={reviewingId === p.user_id}
                                                onClick={() => handleReview(p.user_id, 'rejected', p.goals, p.assists)}
                                                style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', background: G.redDim, color: G.red, border: `1px solid rgba(240,68,56,0.2)` }}>
                                                Từ chối
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p .`
Expected: no errors referencing `MatchPerformancePanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/Attendance/MatchPerformancePanel.tsx
git commit -m "feat: add MatchPerformancePanel component"
```

---

### Task 9: Wire the panel into the session detail page

**Files:**
- Modify: `frontend/app/app/attendance/sessions/[id]/page.tsx`

**Interfaces:**
- Consumes: `MatchPerformancePanel` (default export) from Task 8.

- [ ] **Step 1: Import the component**

Find:
```tsx
import { SessionForm, SessionFormData } from '@/components/Attendance/SessionForm'
```
Add directly below it:
```tsx
import MatchPerformancePanel from '@/components/Attendance/MatchPerformancePanel'
```

- [ ] **Step 2: Render the panel when `isMatch` is true**

Find the closing of the Stats block:
```tsx
                </div>
            )}

            {/* Member: my response card */}
```
Replace with:
```tsx
                </div>
            )}

            {isMatch && (
                <MatchPerformancePanel
                    sessionId={id}
                    isManager={isManager}
                    currentUserId={user?.id}
                    myCheckinResponse={myCheckin?.response}
                    homeScore={session.home_score}
                    awayScore={session.away_score}
                    sessionActive={isActive}
                    onResultUpdated={(updates) => setSession(prev => prev ? { ...prev, ...updates } : prev)}
                />
            )}

            {/* Member: my response card */}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p .`
Expected: no errors referencing `page.tsx` (specifically no missing-prop errors on `MatchPerformancePanel`).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/app/attendance/sessions/\[id\]/page.tsx
git commit -m "feat: render match performance panel on match session detail page"
```

---

### Task 10: Manual browser verification (golden path)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev servers**

Backend: `cd backend && npm run dev` (skip if already running — check `lsof -i :3001`).
Frontend: use the `preview_start` tool with the `frontend-dev` launch config (or `cd frontend && npm run dev` if driving manually), then open it in a mobile-width (375×812) browser viewport.

- [ ] **Step 2: As a manager, create a match session**

Navigate to Điểm danh → create a new session with type "Trận đấu". Confirm it appears in the list with the ⚽ icon.

- [ ] **Step 3: As a member, check in "yes" and confirm the panel appears**

Open the session detail page as a member who is on the roster. Tap "✓ Có, tôi tham gia". Confirm the page now shows "Kết quả trận đấu" and "Thành tích cá nhân" sections (they must NOT appear on a training-session detail page — spot check one of those too).

- [ ] **Step 4: Submit performance as the member**

Enter Goals=2, Assists=1, tap "Gửi thành tích". Confirm a "Chờ duyệt" badge appears and the inputs are still editable (not yet approved).

- [ ] **Step 5: Confirm a member who checked in "no" doesn't see the input form**

Log in as (or switch to) a different member who responded "no" to this session. Confirm the personal input card is absent, but the team list under "Thành tích cá nhân" still shows the first member's pending row.

- [ ] **Step 6: Approve as manager and confirm points**

As the manager, tap "Duyệt" on the pending row. Confirm the badge flips to "Đã duyệt" and the inputs for that member are now disabled if viewed as that member. Navigate to BXH (leaderboard) and confirm the member's point total increased by 5 (2 goals×2 + 1 assist×1).

- [ ] **Step 7: Record the match result**

As the manager, tap "Nhập tỷ số", enter 5/3, save. Confirm the card now shows "Đội mình 5 - 3 Đối thủ" without a page reload (state updates via `onResultUpdated`). Reload the page and confirm the score persisted (came back from the API).

- [ ] **Step 8: Check console/network for errors**

Use the browser tool's `read_console_messages` (onlyErrors) and confirm no new errors were introduced across steps 2–7.

No commit for this task (verification only).

---

## Self-Review Notes

- **Spec coverage:** every requirement from the design spec (`docs/superpowers/specs/2026-08-09-match-performance-tracking-design.md`) maps to a task — data model (Task 1), API/RBAC (Tasks 3–5), points integration (Tasks 2–3), frontend (Tasks 7–9), manual verification in place of automated tests (Tasks 6, 10) per the project's "skip test file generation" rule.
- **Placeholder scan:** no TBD/TODO; every code step contains complete, runnable code.
- **Type consistency:** `MatchPerformance`, `computePoints`, and the four new hook/service method names and signatures are used identically across Tasks 3, 4, 7, 8, 9.
- **Scope:** single cohesive feature, not decomposed further — matches the spec's stated scope exactly (no opponent name, no extra stat types, no configurable points).
