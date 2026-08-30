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

const validatePhoneAndPassword = (phone, password) => {
    if (!phone) throw new ValidationError('Phone number is required');
    if (!password) throw new ValidationError('Password is required');
    if (password.length < 8) throw new ValidationError('Password must be at least 8 characters');

    const phoneRegex = /^[0-9+\-\s()]{10,}$/;
    if (!phoneRegex.test(phone)) throw new ValidationError('Invalid phone number format');
};

// Builds the JWT + response payload shared by login and register.
const buildAuthResponse = async (user, isNewUser) => {
    const allTeams = await getUserTeams(user.id);

    let currentTeam = null;
    let currentRole = 'member';

    if (allTeams.length > 0) {
        const firstTeam = allTeams[0];
        currentTeam = { id: firstTeam.id, name: firstTeam.name };
        currentRole = firstTeam.role;
    }

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
        return {
            token,
            user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role: 'member', team_id: null },
            team: null,
            has_team: false,
            teams: [],
            is_new_user: isNewUser
        };
    }

    logger.info('User authenticated', { user_id: user.id, role: currentRole, team_id: currentTeam.id, total_teams: allTeams.length });

    return {
        token,
        user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role: currentRole, team_id: currentTeam.id },
        team: currentTeam,
        has_team: true,
        teams: allTeams,
        is_new_user: isNewUser
    };
};

// Phone + password login — rejects unknown phone numbers instead of registering them.
const phoneLoginHandler = async (req, res) => {
    try {
        const { phone, password } = req.body;
        validatePhoneAndPassword(phone, password);

        logger.info('Phone login initiated', { phone: phone.substring(0, 7) + '****' });

        const user = await db('users').where({ phone }).first();
        if (!user) {
            throw new AuthenticationError('Số điện thoại chưa có tài khoản, vui lòng đăng ký');
        }

        const isPasswordValid = await verifyPassword(password, user.password_hash || '');
        if (!isPasswordValid) {
            throw new AuthenticationError('Invalid phone number or password');
        }
        await db('users').where({ id: user.id }).update({ last_login_at: new Date() });

        return res.json(await buildAuthResponse(user, false));
    } catch (error) {
        return handleError(error, req, res, { endpoint: '/auth/phone/login' });
    }
};

// Phone + password registration — rejects phone numbers that already have an account.
const phoneRegisterHandler = async (req, res) => {
    try {
        const { phone, full_name, password } = req.body;
        validatePhoneAndPassword(phone, password);
        if (!full_name) throw new ValidationError('Full name is required');

        logger.info('Phone registration initiated', { phone: phone.substring(0, 7) + '****' });

        const existing = await db('users').where({ phone }).first();
        if (existing) {
            throw new ValidationError('Số điện thoại đã có tài khoản, vui lòng đăng nhập');
        }

        const password_hash = await hashPassword(password);
        const email = `phone_${phone.replace(/\D/g, '')}@football-team.local`;
        const [user] = await db('users')
            .insert({ phone, full_name, email, password_hash, status: 'active', created_at: new Date() })
            .returning('*');
        logger.info('New user registered via phone', { user_id: user.id });

        return res.json(await buildAuthResponse(user, true));
    } catch (error) {
        return handleError(error, req, res, { endpoint: '/auth/phone/register' });
    }
};

module.exports = { phoneLoginHandler, phoneRegisterHandler };
