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
