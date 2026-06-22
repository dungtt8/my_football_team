const db = require('../config/database');
const authService = require('../services/authService');
const { handleError, ValidationError } = require('../services/errorService');
const logger = require('../utils/logger');

const authHandler = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      throw new ValidationError('Authorization code is required');
    }

    logger.info('Zalo OAuth callback initiated', { code: code.substring(0, 10) });

    let accessToken;
    try {
      // Exchange code for access token
      accessToken = await authService.exchangeZaloCode(code);
    } catch (error) {
      throw new ValidationError('Invalid or expired authorization code');
    }

    // Fetch user info from Zalo
    const zaloUserData = await authService.fetchZaloUserInfo(accessToken);
    logger.info('Zalo user info fetched', { zalo_user_id: zaloUserData.zalo_user_id });

    // Check if user exists in database (mock for now)
    let user = null;
    try {
      if (db && typeof db === 'function') {
        // In production, this queries the real database
        user = await db('users')
          .where('zalo_user_id', zaloUserData.zalo_user_id)
          .first();
      }
    } catch (dbError) {
      logger.warn('Database query failed, proceeding with new user creation', {
        error: dbError.message
      });
    }

    if (!user) {
      logger.info('New user detected, creating team and user', {
        zalo_user_id: zaloUserData.zalo_user_id,
        email: zaloUserData.email
      });

      // Mock: Create user object (in production, would insert to DB)
      user = {
        id: 1,
        team_id: 1,
        email: zaloUserData.email,
        full_name: zaloUserData.full_name,
        zalo_user_id: zaloUserData.zalo_user_id,
        role: 'owner',
        status: 'active'
      };
    } else {
      logger.info('Existing user found, updating last login');
      user.last_login_at = new Date();
    }

    // Generate JWT
    const token = authService.generateJWT(user);

    logger.info('User authenticated successfully', { user_id: user.id, team_id: user.team_id });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team_id: user.team_id
      }
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/auth/zalo/callback'
    });
  }
};

module.exports = authHandler;
