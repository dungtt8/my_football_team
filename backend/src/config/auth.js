require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Refusing to start.');
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: '24h',
  refreshTokenExpiration: '7d',
  zaloAppId: process.env.ZALO_APP_ID,
  zaloAppSecret: process.env.ZALO_APP_SECRET,
  zaloOAuthRedirectUri: process.env.ZALO_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/zalo/callback'
};
