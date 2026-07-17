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

    if (row) return row;

    // Self-heal: a checkin row is only auto-created for members who were
    // already active when the session was created (see
    // attendanceHandler.createSession -> createCheckinsForSession). A member
    // who joined the team afterwards has no row, so the join above finds
    // nothing even though there IS an active session they should be able to
    // respond to — that's what produced the "Không tìm thấy phiếu điểm danh
    // cho buổi này" error on click. If there's an active session and the
    // user is a current active member, create their missing checkin row now
    // instead of leaving them permanently unable to check in.
    const session = await db('attendance_sessions')
        .where({ team_id: teamId, status: 'active' })
        .orderBy('session_date', 'desc')
        .first();

    if (!session) return null;

    const membership = await db('team_members')
        .where({ team_id: teamId, user_id: userId, status: 'active' })
        .first();

    if (!membership) return null;

    const now = new Date();
    const [created] = await db('attendance_checkins')
        .insert({
            session_id: session.id,
            user_id: userId,
            team_id: teamId,
            response: null,
            responded_at: null,
            created_at: now,
            updated_at: now,
        })
        // Guard against a race with another request/creation doing the same thing.
        .onConflict(['session_id', 'user_id'])
        .ignore()
        .returning('*');

    const finalCheckin = created || await db('attendance_checkins')
        .where({ session_id: session.id, user_id: userId })
        .first();

    if (!finalCheckin) return null;

    return {
        id: finalCheckin.id,
        session_id: finalCheckin.session_id,
        user_id: finalCheckin.user_id,
        response: finalCheckin.response,
        responded_at: finalCheckin.responded_at,
        session_date: session.session_date,
        check_in_deadline: session.check_in_deadline,
        location: session.location,
        session_type: session.session_type,
        description: session.description,
        session_status: session.status,
    };
}

/**
 * Member responds yes/no to their checkin.
 * Returns updated checkin row.
 */
async function respondToCheckin(checkinId, userId, response) {
    if (!['yes', 'no'].includes(response)) {
        throw new Error('Response must be "yes" or "no"');
    }

    // Wrap the read-check-write in a transaction and re-verify the parent
    // session's status inside it, so a concurrent attendanceHandler.closeSession
    // can't close the session in between our check and our update.
    return db.transaction(async (trx) => {
        // Verify ownership
        const checkin = await trx('attendance_checkins')
            .where({ id: checkinId, user_id: userId })
            .first();

        if (!checkin) throw new Error('Checkin not found');

        // Verify session is still active and deadline not passed (re-checked
        // inside the transaction to avoid racing with session close).
        // forUpdate() locks the session row so a concurrent closeSession
        // update blocks until this transaction commits/rolls back.
        const session = await trx('attendance_sessions')
            .where({ id: checkin.session_id, status: 'active' })
            .forUpdate()
            .first();

        if (!session) throw new Error('Session already closed');

        if (session.check_in_deadline && new Date() > new Date(session.check_in_deadline)) {
            throw new Error('Response deadline has passed');
        }

        const now = new Date();
        await trx('attendance_checkins')
            .where({ id: checkinId })
            .update({ response, responded_at: now, updated_at: now });

        return trx('attendance_checkins').where({ id: checkinId }).first();
    });
}

/**
 * Manager confirms (or overrides) a member's participation on their behalf,
 * e.g. someone who reported in person / over the phone instead of tapping
 * Yes/No in the app themselves.
 *
 * Scoped by team_id (not user_id, since the manager is acting on someone
 * else's checkin) and, unlike respondToCheckin, does not enforce the
 * check_in_deadline — a manager should still be able to confirm attendance
 * after the response deadline has passed. The session must still be active
 * (can't edit checkins for an already-closed/points-awarded session).
 */
async function respondToCheckinAsManager(checkinId, teamId, response) {
    if (!['yes', 'no'].includes(response)) {
        throw new Error('Response must be "yes" or "no"');
    }

    return db.transaction(async (trx) => {
        const checkin = await trx('attendance_checkins')
            .where({ id: checkinId, team_id: teamId })
            .first();

        if (!checkin) throw new Error('Checkin not found');

        // Lock the session row so this can't race a concurrent closeSession.
        const session = await trx('attendance_sessions')
            .where({ id: checkin.session_id, team_id: teamId, status: 'active' })
            .forUpdate()
            .first();

        if (!session) throw new Error('Session already closed');

        const now = new Date();
        await trx('attendance_checkins')
            .where({ id: checkinId })
            .update({ response, responded_at: now, updated_at: now });

        return trx('attendance_checkins as ac')
            .join('users as u', 'u.id', 'ac.user_id')
            .where('ac.id', checkinId)
            .select('ac.*', 'u.full_name', 'u.email')
            .first();
    });
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
 * Verifies the session belongs to the given team before returning stats.
 * Returns null if the session doesn't exist or doesn't belong to the team.
 */
async function getSessionStats(sessionId, teamId) {
    const session = await db('attendance_sessions')
        .where({ id: sessionId, team_id: teamId })
        .first();

    if (!session) return null;

    const checkins = await db('attendance_checkins')
        .where({ session_id: sessionId, team_id: teamId })
        .select('response');

    const yes = checkins.filter(c => c.response === 'yes').length;
    const no = checkins.filter(c => c.response === 'no').length;
    const pending = checkins.filter(c => !c.response).length;

    return { total: checkins.length, yes, no, pending };
}

/**
 * Send a reminder notification to members who still haven't responded (yes/no)
 * to an active session's check-in, for teams whose configured notification
 * hour (checkin_creation_time, UTC) matches the current hour.
 *
 * Runs hourly via the `attendance.checkin-notifications` Inngest cron. Gating
 * by the team's configured hour means this only fires once per session per
 * day (the cron itself only ticks once per hour), so it won't spam members.
 */
async function checkAndCreateCheckInNotifications() {
    const currentHour = new Date().getUTCHours();

    const teams = await db('teams')
        .whereNull('deleted_at')
        .select('id', 'name', 'checkin_creation_time');

    let sessionsChecked = 0;
    let notificationsSent = 0;

    for (const team of teams) {
        const [configHour] = (team.checkin_creation_time || '13:00').split(':').map(Number);
        if (configHour !== currentHour) continue;

        const activeSessions = await db('attendance_sessions')
            .where('team_id', team.id)
            .where('status', 'active')
            .where(function () {
                this.whereNull('check_in_deadline').orWhere('check_in_deadline', '>', new Date());
            });

        if (activeSessions.length === 0) continue;

        sessionsChecked += activeSessions.length;
        const sessionById = new Map(activeSessions.map(s => [s.id, s]));

        // One query for every session's pending checkins instead of one per session.
        const pending = await db('attendance_checkins')
            .whereIn('session_id', activeSessions.map(s => s.id))
            .whereNull('response')
            .select('session_id', 'user_id');

        if (pending.length === 0) continue;

        const now = db.fn.now();
        const rows = pending.map(checkin => {
            const session = sessionById.get(checkin.session_id);
            return {
                user_id: checkin.user_id,
                team_id: team.id,
                message: `Nhắc điểm danh: vui lòng phản hồi buổi ${session.session_type === 'match' ? 'thi đấu' : 'tập'} ngày ${new Date(session.session_date).toLocaleDateString('vi-VN')}`,
                metadata: JSON.stringify({ session_id: session.id }),
                is_read: false,
                created_at: now,
            };
        });

        // Bulk insert instead of one insert per pending checkin — the
        // per-user existence check that sendInternalNotification does is
        // unnecessary here since checkin.user_id is already FK-backed.
        try {
            await db('notifications').insert(rows);
            notificationsSent += rows.length;
        } catch (error) {
            logger.warn('Failed to send checkin reminders batch', {
                team_id: team.id,
                count: rows.length,
                error: error.message,
            });
        }
    }

    logger.info('Checkin notification sweep complete', { sessionsChecked, notificationsSent });
    return { sessions_checked: sessionsChecked, notifications_sent: notificationsSent };
}

module.exports = {
    createCheckinsForSession,
    getCheckinForUser,
    getActiveCheckinForUser,
    respondToCheckin,
    respondToCheckinAsManager,
    getSessionCheckins,
    awardPointsForSession,
    getSessionStats,
    checkAndCreateCheckInNotifications,
};
