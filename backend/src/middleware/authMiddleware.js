const authService = require('../services/authService');

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Missing authentication token' });
    }

    // Verify and decode token
    const decoded = authService.verifyJWT(token);

    // Attach user context to request
    req.user = decoded;
    req.teamId = decoded.team_id;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
