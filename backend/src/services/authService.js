const jwt = require('jsonwebtoken');
const axios = require('axios');
const { jwtSecret, jwtExpiration, zaloAppId, zaloAppSecret } = require('../config/auth');

class AuthService {
  generateJWT(user) {
    const payload = {
      user_id: user.id,
      team_id: user.team_id,
      email: user.email,
      role: user.role,
      zalo_user_id: user.zalo_user_id
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
