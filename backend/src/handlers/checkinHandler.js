const db = require('../config/database');
const logger = require('../utils/logger');
const errorService = require('../services/errorService');
const checkinService = require('../services/checkinService');
const authService = require('./authService');

/**
 * GET /api/attendance/checkin/active
 * Get active check-in for current member
 * Requires: JWT token
 */
const getActiveCheckIn = async (req, res) => {
    try {
        const memberId = req.user?.id;
        const teamId = req.user?.team_id;

        if (!memberId || !teamId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const checkIn = await checkinService.getActiveCheckIn(teamId, memberId);

        res.json({
            check_in: checkIn ? {
                id: checkIn.id,
                session_time: checkIn.session_time,
                session_location: checkIn.session_location,
                session_type: checkIn.session_type,
                response: checkIn.response,
                responded_at: checkIn.responded_at,
            } : null,
        });
    } catch (error) {
        return errorService.handleError(error, req, res, { endpoint: 'GET /api/attendance/checkin/active' });
    }
};

/**
 * POST /api/attendance/checkin/:checkInId/respond
 * Member responds to check-in (yes/no)
 * Body: { response: 'yes' | 'no' }
 * Requires: JWT token
 */
const respondToCheckIn = async (req, res) => {
    try {
        const { checkInId } = req.params;
        const { response } = req.body;
        const memberId = req.user?.id;
        const teamId = req.user?.team_id;

        if (!memberId || !teamId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validate response
        if (!['yes', 'no'].includes(response)) {
            return res.status(400).json({ error: 'Response must be "yes" or "no"' });
        }

        // Verify this check-in belongs to this member
        const checkIn = await db('attendance_checkins')
            .where('id', checkInId)
            .where('member_id', memberId)
            .where('team_id', teamId)
            .first();

        if (!checkIn) {
            return res.status(404).json({ error: 'Check-in not found' });
        }

        const result = await checkinService.respondToCheckIn(checkInId, response);

        res.json({
            success: true,
            check_in: {
                id: result.id,
                response: result.response,
                responded_at: result.responded_at,
            },
        });
    } catch (error) {
        return errorService.handleError(error, req, res, { endpoint: 'POST /api/attendance/checkin/:checkInId/respond' });
    }
};

/**
 * GET /api/attendance/session/:sessionId/checkin-stats
 * Get check-in statistics for a session
 * Requires: JWT token (owner only)
 */
const getCheckInStats = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const teamId = req.user?.team_id;
        const role = req.user?.role;

        if (!teamId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify session belongs to this team and user is owner
        const session = await db('attendance_sessions')
            .where('id', sessionId)
            .where('team_id', teamId)
            .first();

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (role !== 'owner') {
            return res.status(403).json({ error: 'Only owner can view check-in stats' });
        }

        const stats = await checkinService.getCheckInStats(sessionId);

        res.json({
            session_id: sessionId,
            stats,
        });
    } catch (error) {
        return errorService.handleError(error, req, res, { endpoint: 'GET /api/attendance/session/:sessionId/checkin-stats' });
    }
};

module.exports = {
    getActiveCheckIn,
    respondToCheckIn,
    getCheckInStats,
};
