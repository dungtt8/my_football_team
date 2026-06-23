const db = require('../config/database');
const { handleError, ValidationError, NotFoundError } = require('../services/errorService');
const logger = require('../utils/logger');
const authService = require('../services/authService');

const VALID_ROLES = ['member', 'co_manager', 'owner'];

function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

/**
 * POST /api/teams  (auth required, NO tenancy)
 * Create a new team — caller becomes owner
 * Body: { name, description? }
 */
const createTeam = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { name, description } = req.body;

        if (!name || !name.trim()) throw new ValidationError('Team name is required');

        let invite_code;
        let attempts = 0;
        while (attempts < 10) {
            invite_code = generateInviteCode();
            const exists = await db('teams').where({ invite_code }).first();
            if (!exists) break;
            attempts++;
        }

        // Create team
        const [team] = await db('teams')
            .insert({ name: name.trim(), description: description || null, owner_id: userId, invite_code, created_at: new Date() })
            .returning('*');

        // Add creator as owner in team_members
        await db('team_members').insert({
            team_id: team.id, user_id: userId, role: 'owner', status: 'active', created_at: new Date(),
        });

        // Update user's role to owner
        await db('users').where({ id: userId }).update({ role: 'owner' });

        // Issue new JWT with team context
        const token = authService.generateJWT({ id: userId, team_id: team.id, email: req.user.email, role: 'owner' });

        logger.info('Team created', { team_id: team.id, owner_id: userId, name: team.name });

        return res.status(201).json({
            token,
            team: { id: team.id, name: team.name, invite_code: team.invite_code },
            role: 'owner',
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/teams' });
    }
};

/**
 * POST /api/teams/join  (auth required, NO tenancy)
 * Join an existing team via invite code
 * Body: { invite_code }
 */
const joinTeam = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { invite_code } = req.body;

        if (!invite_code || !invite_code.trim()) throw new ValidationError('Invite code is required');

        const team = await db('teams').where({ invite_code: invite_code.trim().toUpperCase() }).whereNull('deleted_at').first();
        if (!team) throw new NotFoundError('Invalid invite code');

        // Check if already a member
        const existing = await db('team_members').where({ team_id: team.id, user_id: userId }).first();
        if (existing) {
            if (existing.status === 'active') {
                // Already in — just return a fresh token
                const token = authService.generateJWT({ id: userId, team_id: team.id, email: req.user.email, role: existing.role });
                return res.json({ token, team: { id: team.id, name: team.name }, role: existing.role });
            }
            // Reactivate
            await db('team_members').where({ id: existing.id }).update({ status: 'active', deactivated_at: null });
        } else {
            await db('team_members').insert({
                team_id: team.id, user_id: userId, role: 'member', status: 'active', created_at: new Date(),
            });
        }

        const role = existing?.role || 'member';
        const token = authService.generateJWT({ id: userId, team_id: team.id, email: req.user.email, role });

        logger.info('User joined team', { team_id: team.id, user_id: userId });

        return res.json({
            token,
            team: { id: team.id, name: team.name },
            role,
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/teams/join' });
    }
};

/**
 * GET /api/team/invite  (auth + tenancy, owner only)
 * Get invite code for current team
 */
const getInviteCode = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const team = await db('teams').where({ id: teamId }).first();
        if (!team) throw new NotFoundError('Team not found');
        return res.json({ invite_code: team.invite_code, team_name: team.name });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/team/invite' });
    }
};

/**
 * POST /api/team/invite/regenerate  (auth + tenancy, owner only)
 * Generate a new invite code for current team
 */
const regenerateInviteCode = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        let invite_code;
        let attempts = 0;
        while (attempts < 10) {
            invite_code = generateInviteCode();
            const exists = await db('teams').where({ invite_code }).first();
            if (!exists) break;
            attempts++;
        }
        await db('teams').where({ id: teamId }).update({ invite_code });
        logger.info('Invite code regenerated', { team_id: teamId });
        return res.json({ invite_code });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/team/invite/regenerate' });
    }
};

/**
 * GET /api/team/members
 * List all active members of the current team
 * Accessible by all authenticated team members
 */
const listMembers = async (req, res) => {
    try {
        const teamId = req.user.team_id;

        const members = await db('team_members as tm')
            .join('users as u', 'u.id', 'tm.user_id')
            .where({ 'tm.team_id': teamId, 'tm.status': 'active' })
            .whereNull('tm.deleted_at')
            .whereNull('u.deleted_at')
            .select(
                'u.id',
                'u.full_name',
                'u.email',
                'u.phone',
                'tm.role',
                'tm.status',
                'tm.created_at',
                'u.last_login_at'
            )
            .orderByRaw(`CASE tm.role WHEN 'owner' THEN 0 WHEN 'co_manager' THEN 1 ELSE 2 END`)
            .orderBy('u.full_name');

        return res.json({ data: members, total: members.length });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/team/members' });
    }
};

/**
 * PATCH /api/team/members/:userId/role
 * Promote or demote a member's role — owner only
 * Body: { role: 'member' | 'co_manager' | 'owner' }
 */
const updateMemberRole = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const actorRole = req.user.role;
        const targetUserId = parseInt(req.params.userId, 10);
        const { role: newRole } = req.body;

        // Only owner can change roles
        if (actorRole !== 'owner') {
            return res.status(403).json({ error: 'Only the team owner can change member roles' });
        }

        if (!VALID_ROLES.includes(newRole)) {
            throw new ValidationError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
        }

        // Prevent owner from changing their own role
        if (targetUserId === req.user.user_id) {
            throw new ValidationError('Cannot change your own role');
        }

        const membership = await db('team_members')
            .where({ team_id: teamId, user_id: targetUserId, status: 'active' })
            .first();

        if (!membership) {
            throw new NotFoundError('Member not found in this team');
        }

        await db('team_members')
            .where({ team_id: teamId, user_id: targetUserId })
            .update({ role: newRole });

        // Also update denormalized role on users table
        await db('users').where({ id: targetUserId }).update({ role: newRole });

        logger.info('Member role updated', {
            team_id: teamId,
            target_user_id: targetUserId,
            old_role: membership.role,
            new_role: newRole,
            by: req.user.user_id,
        });

        const updatedUser = await db('users').where({ id: targetUserId }).first();

        return res.json({
            message: 'Role updated successfully',
            user: {
                id: updatedUser.id,
                full_name: updatedUser.full_name,
                role: newRole,
            },
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PATCH /api/team/members/:userId/role' });
    }
};

/**
 * GET /api/team/settings  (auth + tenancy, all members)
 * Get current team settings (general info, attendance, finance)
 */
const getSettings = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const team = await db('teams').where({ id: teamId }).first();

        if (!team) throw new NotFoundError('Team not found');

        return res.json({
            general: {
                name: team.name,
                description: team.description,
                owner_id: team.owner_id,
            },
            attendance: {
                enabled: team.attendance_enabled,
                cooldown_minutes: team.attendance_cooldown_minutes,
            },
            finance: {
                closing_day: team.finance_closing_day,
                closing_time: team.finance_closing_time,
            },
            scheduling: {
                auto_create_sessions: team.auto_create_sessions || false,
                session_frequency: team.session_frequency || 'disabled',
                session_days: team.session_days || '',
                session_time: team.session_time || '18:00',
                session_type: team.session_type || 'training',
                session_location: team.session_location || '',
            },
            invite: {
                code: team.invite_code,
            },
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/team/settings' });
    }
};

/**
 * PUT /api/team/settings  (auth + tenancy, owner only)
 * Update team settings (name, description, attendance rules, finance rules)
 * Body: { general?, attendance?, finance? }
 */
const updateSettings = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const { general, attendance, finance } = req.body;

        // Only owner can update settings
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Only team owner can update settings' });
        }

        const updates = {};

        // Update general info
        if (general) {
            if (general.name && general.name.trim()) {
                updates.name = general.name.trim();
            }
            if (general.hasOwnProperty('description')) {
                updates.description = general.description || null;
            }
        }

        // Update attendance settings
        if (attendance) {
            if (attendance.hasOwnProperty('enabled')) {
                updates.attendance_enabled = Boolean(attendance.enabled);
            }
            if (attendance.cooldown_minutes !== undefined) {
                const cooldown = parseInt(attendance.cooldown_minutes, 10);
                if (isNaN(cooldown) || cooldown < 1 || cooldown > 60) {
                    throw new ValidationError('Attendance cooldown must be between 1 and 60 minutes');
                }
                updates.attendance_cooldown_minutes = cooldown;
            }
        }

        // Update finance settings
        if (finance) {
            if (finance.closing_day !== undefined) {
                const day = parseInt(finance.closing_day, 10);
                if (isNaN(day) || day < 1 || day > 31) {
                    throw new ValidationError('Finance closing day must be between 1 and 31');
                }
                updates.finance_closing_day = day;
            }
            if (finance.closing_time) {
                const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
                if (!timeRegex.test(finance.closing_time)) {
                    throw new ValidationError('Finance closing time must be in HH:mm format');
                }
                updates.finance_closing_time = finance.closing_time;
            }
        }

        // Update scheduling settings
        if (req.body.scheduling) {
            const scheduling = req.body.scheduling;
            if (scheduling.hasOwnProperty('auto_create_sessions')) {
                updates.auto_create_sessions = Boolean(scheduling.auto_create_sessions);
            }
            if (scheduling.session_frequency !== undefined) {
                const validFrequencies = ['disabled', 'daily', 'weekly', 'custom'];
                if (!validFrequencies.includes(scheduling.session_frequency)) {
                    throw new ValidationError('Session frequency must be one of: disabled, daily, weekly, custom');
                }
                updates.session_frequency = scheduling.session_frequency;
            }
            if (scheduling.session_days !== undefined) {
                if (scheduling.session_days && typeof scheduling.session_days === 'string') {
                    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                    const days = scheduling.session_days.split(',').map(d => d.trim().toLowerCase());
                    const invalidDays = days.filter(d => !validDays.includes(d));
                    if (invalidDays.length > 0) {
                        throw new ValidationError(`Invalid days: ${invalidDays.join(', ')}. Valid days are: mon, tue, wed, thu, fri, sat, sun`);
                    }
                }
                updates.session_days = scheduling.session_days || null;
            }
            if (scheduling.session_time !== undefined) {
                const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
                if (scheduling.session_time && !timeRegex.test(scheduling.session_time)) {
                    throw new ValidationError('Session time must be in HH:mm format');
                }
                updates.session_time = scheduling.session_time || '18:00';
            }
            if (scheduling.session_type !== undefined) {
                const validTypes = ['training', 'match', 'both'];
                if (!validTypes.includes(scheduling.session_type)) {
                    throw new ValidationError('Session type must be one of: training, match, both');
                }
                updates.session_type = scheduling.session_type;
            }
            if (scheduling.session_location !== undefined) {
                updates.session_location = scheduling.session_location || null;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.json({ message: 'No changes made' });
        }

        await db('teams').where({ id: teamId }).update(updates);

        logger.info('Team settings updated', { team_id: teamId, by: req.user.user_id, changes: Object.keys(updates) });

        const updatedTeam = await db('teams').where({ id: teamId }).first();

        return res.json({
            message: 'Settings updated successfully',
            general: {
                name: updatedTeam.name,
                description: updatedTeam.description,
            },
            attendance: {
                enabled: updatedTeam.attendance_enabled,
                cooldown_minutes: updatedTeam.attendance_cooldown_minutes,
            },
            finance: {
                closing_day: updatedTeam.finance_closing_day,
                closing_time: updatedTeam.finance_closing_time,
            },
            scheduling: {
                auto_create_sessions: updatedTeam.auto_create_sessions || false,
                session_frequency: updatedTeam.session_frequency || 'disabled',
                session_days: updatedTeam.session_days || '',
                session_time: updatedTeam.session_time || '18:00',
                session_type: updatedTeam.session_type || 'training',
                session_location: updatedTeam.session_location || '',
            },
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PUT /api/team/settings' });
    }
};

module.exports = { createTeam, joinTeam, getInviteCode, regenerateInviteCode, listMembers, updateMemberRole, getSettings, updateSettings };
