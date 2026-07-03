const jwt = require('jsonwebtoken');
const axios = require('axios');
const { jwtSecret, jwtExpiration, zaloAppId, zaloAppSecret } = require('../config/auth');

class AuthService {
  /**
   * Generate JWT with multi-team support
   * @param {Object} user - User object with id, email, team_id, role, zalo_user_id
   * @param {Array} teams - Optional array of user's teams [{id, name, role}, ...]
   */
  generateJWT(user, teams = []) {
    const payload = {
      id: user.id,       // primary field used by handlers
      user_id: user.id,  // keep for backward compat with existing tokens
      team_id: user.team_id,
      email: user.email,
      role: user.role, // Current team role
      zalo_user_id: user.zalo_user_id,
      teams // All teams user belongs to with their roles
    };

    return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
  }

  verifyJWT(token) {
    try {
      return jwt.verify(token, jwtSecret);
    } catch (error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  decodeJWT(token) {
    return jwt.decode(token);
  }

  async exchangeZaloCode(code) {
    try {
      const response = await axios.post('https://oauth.zaloapp.com/v4/access_token', {
        app_id: zaloAppId,
        app_secret: zaloAppSecret,
        code
      });

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Zalo OAuth exchange failed: ${error.message}`);
    }
  }

  async fetchZaloUserInfo(accessToken) {
    try {
      const response = await axios.get('https://graph.zalo.me/v2.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      return {
        zalo_user_id: response.data.id,
        email: response.data.email,
        full_name: response.data.name,
        avatar_url: response.data.avatar
      };
    } catch (error) {
      throw new Error(`Zalo user fetch failed: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
