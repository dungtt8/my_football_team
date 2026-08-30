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
