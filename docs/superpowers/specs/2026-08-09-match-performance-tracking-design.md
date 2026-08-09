# Match Performance Tracking — Design

Date: 2026-08-09

## Purpose

Let members who attended a match ("Trận đấu") self-report their personal
match stats (goals, assists). Let managers officially record the match
result (score) and review/approve member-submitted stats. Approved stats
award bonus points into the existing gamification system.

## Scope

- Applies **only** to sessions with `session_type = 'match'`. Training
  sessions ("Buổi tập") are unaffected.
- Only members whose attendance check-in `response = 'yes'` for that
  session may submit performance stats for it.
- Stats tracked: `goals`, `assists`. No other stat types in this iteration.
- Match result: `home_score` / `away_score` only (no opponent name, no
  separate win/draw/loss field — derivable from the score if ever needed).

## Data model

### `attendance_sessions` (extend existing table)

New nullable columns:
- `home_score` (integer)
- `away_score` (integer)
- `result_recorded_by` (FK → users.id, nullable)
- `result_recorded_at` (timestamp, nullable)

Rationale: the match result is 1:1 with a session, so extending the
existing table avoids an unnecessary join. Consistent with "always
simple implementation."

### `match_performances` (new table)

| column | type | notes |
|---|---|---|
| `id` | serial PK | |
| `session_id` | FK → attendance_sessions.id | cascade delete |
| `user_id` | FK → users.id | |
| `team_id` | FK → teams.id | for tenancy scoping, matches existing convention |
| `goals` | integer, default 0 | |
| `assists` | integer, default 0 | |
| `status` | enum `'pending' \| 'approved' \| 'rejected'`, default `'pending'` | |
| `submitted_at` | timestamp | set/updated on member submit |
| `reviewed_by` | FK → users.id, nullable | manager who last approved/rejected |
| `reviewed_at` | timestamp, nullable | |
| unique constraint | `(session_id, user_id)` | one row per member per match — member edits upsert this row |

### State rules

- Member can create/update their own row only while `status` is
  `pending` or `rejected`. Once `approved`, the member can no longer
  edit it (read-only on their side).
- Manager can edit `goals`/`assists` on any row regardless of status,
  and can transition `pending → approved`, `pending → rejected`, or
  `approved → rejected` (and back).
- Editing an already-`approved` row (by a manager) triggers a point
  recalculation (see below) rather than blocking the edit.

## API & permissions

Follows the existing `rbacMiddleware(['role', ...])` pattern used
throughout `backend/src/app.js`.

| Endpoint | Roles | Behavior |
|---|---|---|
| `PUT /api/attendance/sessions/:id/result` | `co_manager`, `owner` | Upsert `home_score`/`away_score` on the session. 400 if session is not `session_type='match'`. |
| `POST /api/attendance/sessions/:id/performance` | any authenticated team member | Upsert the caller's own `match_performances` row for the session with `{goals, assists}`. 400 if session is not a match, or if caller's checkin `response !== 'yes'`, or if the caller's existing row is `status='approved'`. Resets `status` to `'pending'` on each submit/edit while not approved. |
| `GET /api/attendance/sessions/:id/performance` | any team member | List all `match_performances` rows for the session, joined with member name, for display. |
| `PATCH /api/attendance/sessions/:id/performance/:userId` | `co_manager`, `owner` | Update `{goals, assists, status}` for a specific member's row. Sets `reviewed_by`/`reviewed_at`. Triggers point adjustment logic below. |

## Points integration

Uses the existing generic ledger `gamificationService.addPoints(userId, points, reason, teamId, sessionId)`.

- On transition to `approved` (from `pending` or `rejected`, or on an
  edit while already `approved`): compute
  `newPoints = goals*2 + assists*1`.
  - If this is the *first* approval for the row, call
    `addPoints(userId, newPoints, 'match_performance', teamId, sessionId)`.
  - If the row was already `approved` and is being edited/re-approved,
    compute `delta = newPoints - lastAwardedPoints` and call
    `addPoints(userId, delta, 'match_performance_adjustment', teamId, sessionId)`
    (only if `delta !== 0`). Track `lastAwardedPoints` implicitly by
    summing prior `match_performance*` ledger entries for that
    `(userId, sessionId)` pair — no new column needed.
- On transition `approved → rejected`: call `addPoints` with the
  negative of the currently-awarded total, reason
  `'match_performance_revoked'`, to zero it out.
- Point values (`goals*2 + assists*1`) are hardcoded constants for this
  iteration — not team-configurable.

## Frontend

File: `frontend/app/app/attendance/sessions/[id]/page.tsx`. No new
route/tab — both new blocks render inline when `isMatch` is true,
positioned between the existing checkin-stats grid and the
checkin-response list.

### Block A — "Kết quả trận đấu" card

- Displays `"Đội mình {home_score} - {away_score} Đối thủ"` if scores are
  set, else `"Chưa cập nhật kết quả"`.
- Manager-only "Nhập/Sửa tỷ số" button opens a small modal (reusing the
  existing modal visual pattern from `frontend/app/app/team/page.tsx`)
  with two numeric inputs, calling `PUT .../result`.

### Block B — "Thành tích cá nhân" section

- **Self card** (only shown if current user's checkin `response ===
  'yes'`): numeric inputs for Goals/Assists, a status badge (Chờ duyệt
  / Đã duyệt / Từ chối), disabled inputs when `status === 'approved'`.
  Submit button calls `POST .../performance`.
- **Team list**: every submitted row (name, goals, assists, status).
  Manager sees inline Approve/Reject buttons on `pending` rows, and an
  "Sửa" action on any row that opens the same edit affordance as their
  own (numeric inputs) calling `PATCH .../performance/:userId`.

Data fetching: extend `useAttendance()` hook with
`getMatchPerformances(sessionId)`, `submitMyPerformance(sessionId, data)`,
`reviewPerformance(sessionId, userId, data)`, `setMatchResult(sessionId, data)`.

## Out of scope (explicitly not building)

- Opponent team name/identity tracking.
- Additional stat types (cards, clean sheets, MOTM, etc.).
- Team-configurable point values per stat.
- A dedicated "top scorer" leaderboard (can be a future iteration reusing
  `match_performances` data — no schema changes needed to support it later).
- Applying this to training sessions.
