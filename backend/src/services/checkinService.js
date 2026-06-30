/**
 * checkinService — session-based attendance flow
 *
 * When a session is created:
 *   createCheckinsForSession(sessionId, teamId) → one row per active member
 *
 * Members respond:
 *   respondToCheckin(checkinId, userId, response) → 'yes' | 'no'
 *
 * On session close:
 *   awardPointsForSession(sessionId, teamId) → +10 for 'yes'
 */
const db = require('../config/database');
const logger = require('../utils/logger');

const POINTS_YES = 10;

/**
 * Create attendance_checkin rows for every active member of a team.
 * Called immediately after an attendance_session is inserted.
 */
async function createCheckinsForSession(sessionId, teamId) {
    // Get all active members
    const members = await db('team_members')
        .where({ team_id: teamId, status: 'active' })
        .select('user_id');

    if (members.length === 0) return [];

    const now = new Date();
    const rows = members.map(m => ({
        session_id: sessionId,
        user_id: m.user_id,
        team_id: teamId,
        response: null,
        responded_at: null,
        created_at: now,
        updated_at: now,
    }));

    await db('attendance_checkins').insert(rows);

    logger.info('Created checkins for session', { session_id: sessionId, team_id: teamId, count: rows.length });
    return rows;
}

/**
 * Get the checkin record for a user in a given session.
 */
async function getCheckinForUser(sessionId, userId) {
    return db('attendance_checkins')
        .where({ session_id: sessionId, user_id: userId })
        .first();
}

/**
 * Get the active (latest open) session's checkin for a user.
 * Returns { checkin, session } or null.
 */
async function getActiveCheckinForUser(teamId, userId) {
    const row = await db('attendance_checkins as ac')
        .join('attendance_sessions as s', 's.id', 'ac.session_id')
        .where('ac.user_id', userId)
        .where('ac.team_id', teamId)
        .where('s.status', 'active')
        .where('s.team_id', teamId)
        .orderBy('s.session_date', 'desc')
        .select(
            'ac.id',
            'ac.session_id',
            'ac.user_id',
            'ac.response',
            'ac.responded_at',
            's.session_date',
            's.check_in_deadline',
            's.location',
            's.session_type',
            's.description',
            's.status as session_status',
        )
        .first();

    return row || null;
}

/**
 * Member responds yes/no to their checkin.
 * Returns updated checkin row.
 */
async function respondToCheckin(checkinId, userId, response) {
    if (!['yes', 'no'].includes(response)) {
        throw new Error('Response must be "yes" or "no"');
    }

    // Verify ownership
    const checkin = await db('attendance_checkins')
        .where({ id: checkinId, user_id: userId })
        .first();

    if (!checkin) throw new Error('Checkin not found');

    // Verify session is still active and deadline not passed
    const session = await db('attendance_sessions')
        .where({ id: checkin.session_id, status: 'active' })
        .first();

    if (!session) throw new Error('Session is closed');

    if (session.check_in_deadline && new Date() > new Date(session.check_in_deadline)) {
        throw new Error('Response deadline has passed');
    }

    const now = new Date();
    await db('attendance_checkins')
        .where({ id: checkinId })
        .update({ response, responded_at: now, updated_at: now });

    return db('attendance_checkins').where({ id: checkinId }).first();
}

/**
 * Get all checkins for a session (manager view).
 * Includes user info.
 */
async function getSessionCheckins(sessionId, teamId) {
    return db('attendance_checkins as ac')
        .join('users as u', 'u.id', 'ac.user_id')
        .where('ac.session_id', sessionId)
        .where('ac.team_id', teamId)
        .select(
            'ac.id',
            'ac.user_id',
            'ac.response',
            'ac.responded_at',
            'u.full_name',
            'u.email',
        )
        .orderBy('u.full_name');
}

/**
 * Award points for all members who responded 'yes' to a session.
 * Idempotent — skips if points already awarded for this session.
 * Called when a session is closed.
 */
async function awardPointsForSession(sessionId, teamId) {
    // Check not already awarded
    const existing = await db('user_points')
        .where({ session_id: sessionId, team_id: teamId })
        .first();

    if (existing) {
        logger.info('Points already awarded for session', { session_id: sessionId });
        return;
    }

    const yesCheckins = await db('attendance_checkins')
        .where({ session_id: sessionId, team_id: teamId, response: 'yes' })
        .select('user_id');

    if (yesCheckins.length === 0) return;

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const now = new Date();

    const pointRows = yesCheckins.map(c => ({
        user_id: c.user_id,
        team_id: teamId,
        points: POINTS_YES,
        reason: 'attendance_yes',
        month,
        session_id: sessionId,
        created_at: now,
    }));

    await db('user_points').insert(pointRows);

    logger.info('Points awarded for session', {
        session_id: sessionId,
        team_id: teamId,
        count: pointRows.length,
        points_each: POINTS_YES,
    });
}

/**
 * Get checkin stats summary for a session.
 */
async function getSessionStats(sessionId) {
    const checkins = await db('attendance_checkins')
        .where({ session_id: sessionId })
        .select('response');

    const yes = checkins.filter(c => c.response === 'yes').length;
    const no = checkins.filter(c => c.response === 'no').length;
    const pending = checkins.filter(c => !c.response).length;

    return { total: checkins.length, yes, no, pending };
}

module.exports = {
    createCheckinsForSession,
    getCheckinForUser,
    getActiveCheckinForUser,
    respondToCheckin,
    getSessionCheckins,
    awardPointsForSession,
    getSessionStats,
};
