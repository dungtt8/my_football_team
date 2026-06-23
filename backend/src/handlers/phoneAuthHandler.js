const authService = require('../services/authService');
const { handleError, ValidationError } = require('../services/errorService');
const logger = require('../utils/logger');
const db = require('../config/database');

// Simple phone-based authentication — queries real DB
const phoneAuthHandler = async (req, res) => {
    try {
        const { phone, full_name } = req.body;

        if (!phone) throw new ValidationError('Phone number is required');
        if (!full_name) throw new ValidationError('Full name is required');

        const phoneRegex = /^[0-9+\-\s()]{10,}$/;
        if (!phoneRegex.test(phone)) throw new ValidationError('Invalid phone number format');

        logger.info('Phone auth initiated', { phone: phone.substring(0, 7) + '****' });

        // 1. Upsert user by phone
        let user = await db('users').where({ phone }).first();

        if (!user) {
            const email = `phone_${phone.replace(/\D/g, '')}@football-team.local`;
            const [newUser] = await db('users')
                .insert({ phone, full_name, email, role: 'member', status: 'active', created_at: new Date() })
                .returning('*');
            user = newUser;
            logger.info('New user created via phone', { user_id: user.id });
        } else {
            await db('users').where({ id: user.id }).update({ full_name, last_login_at: new Date() });
            user = { ...user, full_name };
        }

        // 2. Lookup active team membership
        const membership = await db('team_members as tm')
            .join('teams as t', 't.id', 'tm.team_id')
            .where({ 'tm.user_id': user.id, 'tm.status': 'active' })
            .whereNull('t.deleted_at')
            .select('tm.team_id', 'tm.role', 't.name as team_name')
            .first();

        if (!membership) {
            const token = authService.generateJWT({ id: user.id, team_id: null, email: user.email, role: 'member' });
            logger.info('User has no team, redirecting to onboarding', { user_id: user.id });
            return res.json({
                token,
                user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role: 'member', team_id: null },
                team: null,
                has_team: false,
            });
        }

        const { team_id, role, team_name } = membership;
        const token = authService.generateJWT({ id: user.id, team_id, email: user.email, role });

        logger.info('User authenticated', { user_id: user.id, role, team_id });

        return res.json({
            token,
            user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role, team_id },
            team: { id: team_id, name: team_name },
            has_team: true,
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: '/auth/phone/login' });
    }
};

module.exports = phoneAuthHandler;
