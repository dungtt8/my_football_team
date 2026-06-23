const authService = require('../services/authService');
const { handleError, ValidationError } = require('../services/errorService');
const logger = require('../utils/logger');

// Simple phone-based authentication (for development)
const phoneAuthHandler = async (req, res) => {
  try {
    const { phone, full_name } = req.body;

    if (!phone) {
      throw new ValidationError('Phone number is required');
    }

    if (!full_name) {
      throw new ValidationError('Full name is required');
    }

    // Validate phone format (basic check)
    const phoneRegex = /^[0-9+\-\s()]{10,}$/;
    if (!phoneRegex.test(phone)) {
      throw new ValidationError('Invalid phone number format');
    }

    logger.info('Phone auth initiated', { phone: phone.substring(0, 7) + '****' });

    // Mock user creation/retrieval (in production, would query database)
    // For development, we'll create a simple user object based on phone
    const userId = Math.abs(phone.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 10000;
    
    const user = {
      id: userId,
      phone: phone,
      full_name: full_name,
      email: `user_${userId}@football-team.local`,
      team_id: 1, // Default team
      role: 'member', // Default role
      status: 'active'
    };

    logger.info('User authenticated via phone', { user_id: user.id, phone: phone.substring(0, 7) + '****' });

    // Generate JWT
    const token = authService.generateJWT(user);

    return res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team_id: user.team_id
      },
      team: {
        id: user.team_id,
        name: 'My Football Team'
      }
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/auth/phone/login'
    });
  }
};

module.exports = phoneAuthHandler;
