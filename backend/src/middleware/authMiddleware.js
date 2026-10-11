const authService = require('../services/authService');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Missing authentication token' });
    }

    // Verify and decode token
    const decoded = authService.verifyJWT(token);
    const userId = decoded.id ?? decoded.user_id;

    // The JWT's role/team_id claims are set at login time and can go stale
    // for up to 7 days (jwtExpiration). Re-check the live membership on every
    // request so a demoted or kicked member loses access immediately instead
    // of keeping their old role until the token naturally expires.
    if (decoded.team_id) {
      const membership = await db('team_members')
        .where({ team_id: decoded.team_id, user_id: userId })
        .first();

      if (!membership || membership.status !== 'active') {
        return res.status(401).json({ error: 'Membership is no longer active' });
      }

      decoded.role = membership.role;
    }

    // Attach user context to request
    // Normalize user_id → id for consistent access across handlers
    req.user = {
      ...decoded,
      id: userId,
    };
    req.teamId = decoded.team_id;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
