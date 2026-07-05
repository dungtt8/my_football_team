const checkinService = require('../services/checkinService');
const { handleError, ValidationError, NotFoundError } = require('../services/errorService');

/**
 * GET /api/attendance/checkin/active
 * Returns the current user's checkin for the latest active session.
 */
const getActiveCheckIn = async (req, res) => {
    try {
        const userId = req.user?.id;
        const teamId = req.team?.id || req.user?.team_id;
        if (!userId || !teamId) return res.status(401).json({ error: 'Unauthorized' });

        const checkin = await checkinService.getActiveCheckinForUser(teamId, userId);
        return res.json({ check_in: checkin });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/checkin/active' });
    }
};

/**
 * POST /api/attendance/checkin/:checkInId/respond
 * Body: { response: 'yes' | 'no' }
 */
const respondToCheckIn = async (req, res) => {
    try {
        const { checkInId } = req.params;
        const { response } = req.body;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!['yes', 'no'].includes(response))
            throw new ValidationError('Response must be "yes" or "no"');

        const result = await checkinService.respondToCheckin(checkInId, userId, response);
        return res.json({ success: true, check_in: result });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/attendance/checkin/:checkInId/respond' });
    }
};

/**
 * GET /api/attendance/sessions/:sessionId/checkin-stats
 * Manager view: response summary for a session.
 */
const getCheckInStats = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const teamId = req.team?.id || req.user?.team_id;
        if (!teamId) return res.status(401).json({ error: 'Unauthorized' });

        const stats = await checkinService.getSessionStats(sessionId, teamId);
        if (!stats) throw new NotFoundError('Session', sessionId);

        const checkins = await checkinService.getSessionCheckins(sessionId, teamId);
        return res.json({ session_id: sessionId, stats, checkins });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/attendance/sessions/:sessionId/checkin-stats' });
    }
};

module.exports = { getActiveCheckIn, respondToCheckIn, getCheckInStats };
