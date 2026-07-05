const db = require('../config/database');
const gamificationService = require('../services/gamificationService');
const notificationService = require('../services/notificationService');
const checkinService = require('../services/checkinService');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, handleError } = require('../services/errorService');

// ─── Create session ──────────────────────────────────────────────────────────
/**
 * POST /api/attendance/sessions
 * Body: { session_date, session_type, check_in_deadline?, location?, description? }
 * Creates session + auto-creates checkin rows for all active members.
 */
const createSession = async (req, res) => {
    try {
        const { session_date, session_type, check_in_deadline, location, description } = req.body;
        const userId = req.user.id;
        const teamId = req.team.id;

        if (!session_date) throw new ValidationError('session_date is required');
        if (!session_type || !['training', 'match'].includes(session_type))
            throw new ValidationError('session_type must be "training" or "match"');

        const sessionDate = new Date(session_date);
        if (isNaN(sessionDate.getTime())) throw new ValidationError('Invalid session_date format');

        let deadlineDate = null;
        if (check_in_deadline) {
            deadlineDate = new Date(check_in_deadline);
            if (isNaN(deadlineDate.getTime())) throw new ValidationError('Invalid check_in_deadline format');
        }

        const [session] = await db('attendance_sessions').insert({
            team_id: teamId,
            created_by: userId,
            session_date: sessionDate,
            check_in_deadline: deadlineDate,
            location: location || null,
            session_type,
            description: description || null,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
        }).returning('*');

        // Auto-create checkin records for all active members
        await checkinService.createCheckinsForSession(session.id, teamId);

        // Notify via Inngest (fire-and-forget)
        await notificationService.emitEvent('attendance.session_created', {
            session_id: session.id,
            team_id: teamId,
            session_date: session.session_date,
            session_type: session.session_type,
            created_by: userId,
        });

        logger.info('Attendance session created', { session_id: session.id, team_id: teamId });

        return res.status(201).json(session);
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/attendance/sessions' });
    }
};

// ─── List sessions ───────────────────────────────────────────────────────────
/**
 * GET /api/attendance/sessions?status=active&page=1&limit=20
 */
const listSessions = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const teamId = req.team?.id || req.user?.team_id;
        if (!teamId) throw new ValidationError('Team context is required');

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        let q = db('attendance_sessions').where('team_id', teamId);
        if (status) q = q.where('status', status);

        const [{ total }] = await db('attendance_sessions')
            .where('team_id', teamId)
            .modify(qb => { if (status) qb.where('status', status); })
            .count('* as total');

        const sessions = await q.orderBy('session_date', 'desc').limit(limitNum).offset(offset);

        return res.json({
            data: sessions,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/sessions' });
    }
};

// ─── Get session detail ──────────────────────────────────────────────────────
/**
 * GET /api/attendance/sessions/:id
 * Returns session + checkin responses (replaces old attendance_records).
 */
const getSession = async (req, res) => {
    try {
        const { id } = req.params;
        const teamId = req.team.id;

        const session = await db('attendance_sessions')
            .where({ id, team_id: teamId })
            .first();

        if (!session) throw new NotFoundError('Session not found');

        const checkins = await checkinService.getSessionCheckins(id, teamId);
        const stats = await checkinService.getSessionStats(id, teamId);

        return res.json({ session, records: checkins, stats, total_records: checkins.length });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/sessions/:id' });
    }
};

// ─── Close session ───────────────────────────────────────────────────────────
/**
 * POST /api/attendance/sessions/:id/close
 * Closes session and awards points to members who responded 'yes'.
 */
const closeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const teamId = req.team.id;

        const session = await db('attendance_sessions')
            .where({ id, team_id: teamId })
            .first();

        if (!session) throw new NotFoundError('Session not found');
        if (session.status !== 'active') throw new ValidationError('Session is already closed');

        const closedAt = new Date();
        await db('attendance_sessions')
            .where({ id })
            .update({ status: 'closed', closed_at: closedAt, updated_at: closedAt });

        // Award points for 'yes' responses
        await checkinService.awardPointsForSession(id, teamId);

        await notificationService.emitEvent('attendance.session_closed', {
            session_id: id,
            team_id: teamId,
            closed_at: closedAt,
        });

        logger.info('Session closed', { session_id: id, team_id: teamId });

        return res.json({ id, status: 'closed', closed_at: closedAt });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/attendance/sessions/:id/close' });
    }
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
    try {
        const teamId = req.team?.id || req.user?.team_id;
        if (!teamId) throw new ValidationError('Team context is required');
        const currentMonth = gamificationService.getCurrentMonth();
        const leaderboard = await gamificationService.getLeaderboard(teamId, currentMonth);
        return res.json({ month: currentMonth, leaderboard });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/leaderboard' });
    }
};

const getHistoricalLeaderboard = async (req, res) => {
    try {
        const { month } = req.params;
        const teamId = req.team?.id || req.user?.team_id;
        if (!teamId) throw new ValidationError('Team context is required');
        if (!/^\d{4}-\d{2}$/.test(month)) throw new ValidationError('Month must be YYYY-MM');
        const leaderboard = await gamificationService.getLeaderboard(teamId, month);
        return res.json({ month, leaderboard });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/leaderboard/:month' });
    }
};

// ─── User stats ──────────────────────────────────────────────────────────────
const getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const { month } = req.query;
        const teamId = req.team?.id || req.user?.team_id;
        if (!teamId) throw new ValidationError('Team context is required');
        const targetMonth = month || gamificationService.getCurrentMonth();
        if (!/^\d{4}-\d{2}$/.test(targetMonth)) throw new ValidationError('Month must be YYYY-MM');
        const stats = await gamificationService.getUserStats(userId, teamId, targetMonth);
        return res.json(stats);
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/stats/:userId' });
    }
};

// ─── Attendance history (per user) ───────────────────────────────────────────
/**
 * GET /api/attendance/history?month=YYYY-MM
 * Returns the current user's checkin history (using attendance_checkins).
 */
const getAttendanceHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        const teamId = req.team?.id || req.user?.team_id;
        if (!userId) throw new ValidationError('User not authenticated');
        if (!teamId) throw new ValidationError('Team not found');
        const { month } = req.query;
        const targetMonth = month || gamificationService.getCurrentMonth();
        if (!/^\d{4}-\d{2}$/.test(targetMonth)) throw new ValidationError('Month must be YYYY-MM');

        const history = await db('attendance_checkins as ac')
            .join('attendance_sessions as s', 's.id', 'ac.session_id')
            .where('ac.user_id', userId)
            .where('ac.team_id', teamId)
            .whereRaw("TO_CHAR(s.session_date, 'YYYY-MM') = ?", [targetMonth])
            .orderBy('s.session_date', 'desc')
            .select(
                'ac.id',
                'ac.session_id',
                'ac.response',
                'ac.responded_at',
                's.session_date',
                's.location',
                's.session_type',
            );

        return res.json({ user_id: userId, month: targetMonth, history });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/history' });
    }
};

module.exports = {
    createSession,
    listSessions,
    getSession,
    closeSession,
    getLeaderboard,
    getHistoricalLeaderboard,
    getUserStats,
    getAttendanceHistory,
};
