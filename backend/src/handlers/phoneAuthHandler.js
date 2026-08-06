const bcrypt = require('bcryptjs');
const authService = require('../services/authService');
const { handleError, ValidationError, AuthenticationError } = require('../services/errorService');
const logger = require('../utils/logger');
const db = require('../config/database');
const { getUserTeams } = require('./teamHandler');

const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, 10);

const verifyPassword = async (plainPassword, hash) => {
    try {
        return await bcrypt.compare(plainPassword, hash);
    } catch (e) {
        // Malformed/missing hash — treat as auth failure, never a bypass.
        return false;
    }
};

// Phone + password authentication — registers new users, logs in existing ones.
const phoneAuthHandler = async (req, res) => {
    try {
        const { phone, full_name, password } = req.body;

        if (!phone) throw new ValidationError('Phone number is required');
        if (!password) throw new ValidationError('Password is required');
        if (password.length < 8) throw new ValidationError('Password must be at least 8 characters');

        const phoneRegex = /^[0-9+\-\s()]{10,}$/;
        if (!phoneRegex.test(phone)) throw new ValidationError('Invalid phone number format');

        logger.info('Phone auth initiated', { phone: phone.substring(0, 7) + '****' });

        // 1. Find existing user by phone, or register a new one
        let user = await db('users').where({ phone }).first();
        const isNewUser = !user;

        if (!user) {
            if (!full_name) throw new ValidationError('Full name is required');

            const password_hash = await hashPassword(password);
            const email = `phone_${phone.replace(/\D/g, '')}@football-team.local`;
            const [newUser] = await db('users')
                .insert({ phone, full_name, email, password_hash, status: 'active', created_at: new Date() })
                .returning('*');
            user = newUser;
            logger.info('New user registered via phone', { user_id: user.id });
        } else {
            const isPasswordValid = await verifyPassword(password, user.password_hash || '');
            if (!isPasswordValid) {
                throw new AuthenticationError('Invalid phone number or password');
            }
            await db('users').where({ id: user.id }).update({ last_login_at: new Date() });
        }

        // 2. Get all user's team memberships
        const allTeams = await getUserTeams(user.id);

        // 3. Determine current team context
        let currentTeam = null;
        let currentRole = 'member';

        if (allTeams.length > 0) {
            // If user has teams, set first team as current (or could be improved with "last_active_team")
            const firstTeam = allTeams[0];
            currentTeam = { id: firstTeam.id, name: firstTeam.name };
            currentRole = firstTeam.role;
        }

        // 4. Generate JWT
        const token = authService.generateJWT(
            {
                id: user.id,
                team_id: currentTeam?.id || null,
                email: user.email,
                role: currentRole,
                zalo_user_id: user.zalo_user_id
            },
            allTeams
        );

        if (!currentTeam) {
            logger.info('User has no team, redirecting to onboarding', { user_id: user.id });
            return res.json({
                token,
                user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role: 'member', team_id: null },
                team: null,
                has_team: false,
                teams: [],
                is_new_user: isNewUser
            });
        }

        logger.info('User authenticated', { user_id: user.id, role: currentRole, team_id: currentTeam.id, total_teams: allTeams.length });

        return res.json({
            token,
            user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role: currentRole, team_id: currentTeam.id },
            team: currentTeam,
            has_team: true,
            teams: allTeams,
            is_new_user: isNewUser
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: '/auth/phone/login' });
    }
};

module.exports = phoneAuthHandler;
