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

function isPaymentDeadlineActive(startDay, endDay) {
    if (!startDay || !endDay) return false;
    const today = new Date();
    const currentDay = today.getDate();
    return currentDay >= startDay && currentDay <= endDay;
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
                payment_start_day: team.finance_payment_start_day,
                payment_end_day: team.finance_payment_end_day,
                is_payment_deadline_active: isPaymentDeadlineActive(team.finance_payment_start_day, team.finance_payment_end_day),
            },
            fund: {
                bank_account_number: team.bank_account_number,
                bank_name: team.bank_name,
                qr_code_url: team.fund_qr_code_url,
            },
            scheduling: {
                auto_create_sessions: team.auto_create_sessions || false,
                session_frequency: team.session_frequency || 'disabled',
                session_days: team.session_days || '',
                session_time: team.session_time || '18:00',
                session_type: team.session_type || 'training',
                session_location: team.session_location || '',
                auto_session_creation_time: team.auto_session_creation_time || '03:00',
                checkin_creation_day: team.checkin_creation_day || 'mon',
                checkin_creation_time: team.checkin_creation_time || '20:00',
                checkin_start_day: team.checkin_start_day || 'fri',
                checkin_end_day: team.checkin_end_day || 'tue',
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
            if (finance.payment_start_day !== undefined) {
                if (finance.payment_start_day === null) {
                    updates.finance_payment_start_day = null;
                } else {
                    const day = parseInt(finance.payment_start_day, 10);
                    if (isNaN(day) || day < 1 || day > 31) {
                        throw new ValidationError('Payment start day must be between 1 and 31');
                    }
                    updates.finance_payment_start_day = day;
                }
            }
            if (finance.payment_end_day !== undefined) {
                if (finance.payment_end_day === null) {
                    updates.finance_payment_end_day = null;
                } else {
                    const day = parseInt(finance.payment_end_day, 10);
                    if (isNaN(day) || day < 1 || day > 31) {
                        throw new ValidationError('Payment end day must be between 1 and 31');
                    }
                    if (finance.payment_start_day && finance.payment_end_day < finance.payment_start_day) {
                        throw new ValidationError('Payment end day must be after or equal to start day');
                    }
                    updates.finance_payment_end_day = day;
                }
            }
            // Reset notified month when dates change
            if (finance.payment_start_day !== undefined || finance.payment_end_day !== undefined) {
                updates.finance_payment_notified_month = null;
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
            if (scheduling.auto_session_creation_time !== undefined) {
                if (scheduling.auto_session_creation_time) {
                    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
                    if (!timeRegex.test(scheduling.auto_session_creation_time)) {
                        throw new ValidationError('Auto-session creation time must be in HH:mm format (UTC)');
                    }
                    updates.auto_session_creation_time = scheduling.auto_session_creation_time;
                } else {
                    updates.auto_session_creation_time = '03:00'; // Default to 3 AM UTC
                }
            }
            if (scheduling.checkin_creation_day !== undefined) {
                const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                if (scheduling.checkin_creation_day && !validDays.includes(scheduling.checkin_creation_day.toLowerCase())) {
                    throw new ValidationError('Invalid check-in creation day. Must be: mon, tue, wed, thu, fri, sat, sun');
                }
                updates.checkin_creation_day = scheduling.checkin_creation_day || 'mon';
            }
            if (scheduling.checkin_creation_time !== undefined) {
                if (scheduling.checkin_creation_time) {
                    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
                    if (!timeRegex.test(scheduling.checkin_creation_time)) {
                        throw new ValidationError('Check-in creation time must be in HH:mm format (UTC)');
                    }
                    updates.checkin_creation_time = scheduling.checkin_creation_time;
                } else {
                    updates.checkin_creation_time = '20:00'; // Default to 8 PM UTC
                }
            }
            if (scheduling.checkin_start_day !== undefined) {
                const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                if (scheduling.checkin_start_day && !validDays.includes(scheduling.checkin_start_day.toLowerCase())) {
                    throw new ValidationError('Invalid check-in start day. Must be: mon, tue, wed, thu, fri, sat, sun');
                }
                updates.checkin_start_day = scheduling.checkin_start_day || 'fri';
            }
            if (scheduling.checkin_end_day !== undefined) {
                const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                if (scheduling.checkin_end_day && !validDays.includes(scheduling.checkin_end_day.toLowerCase())) {
                    throw new ValidationError('Invalid check-in end day. Must be: mon, tue, wed, thu, fri, sat, sun');
                }
                updates.checkin_end_day = scheduling.checkin_end_day || 'tue';
            }
        }

        // Update fund settings
        if (req.body.fund) {
            const fund = req.body.fund;
            if (fund.bank_account_number !== undefined) {
                if (fund.bank_account_number && typeof fund.bank_account_number === 'string') {
                    const accountNumber = fund.bank_account_number.trim();
                    if (accountNumber && accountNumber.length > 50) {
                        throw new ValidationError('Bank account number is too long (max 50 characters)');
                    }
                    updates.bank_account_number = accountNumber || null;
                } else {
                    updates.bank_account_number = null;
                }
            }
            if (fund.bank_name !== undefined) {
                if (fund.bank_name && typeof fund.bank_name === 'string') {
                    const bankName = fund.bank_name.trim();
                    if (bankName && bankName.length > 100) {
                        throw new ValidationError('Bank name is too long (max 100 characters)');
                    }
                    updates.bank_name = bankName || null;
                } else {
                    updates.bank_name = null;
                }
            }
            if (fund.qr_code_url !== undefined) {
                if (fund.qr_code_url && typeof fund.qr_code_url === 'string') {
                    const url = fund.qr_code_url.trim();
                    if (url && url.length > 500) {
                        throw new ValidationError('QR code URL is too long (max 500 characters)');
                    }
                    updates.fund_qr_code_url = url || null;
                } else {
                    updates.fund_qr_code_url = null;
                }
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
                payment_start_day: updatedTeam.finance_payment_start_day,
                payment_end_day: updatedTeam.finance_payment_end_day,
            },
            fund: {
                bank_account_number: updatedTeam.bank_account_number,
                bank_name: updatedTeam.bank_name,
                qr_code_url: updatedTeam.fund_qr_code_url,
            },
            scheduling: {
                auto_create_sessions: updatedTeam.auto_create_sessions || false,
                session_frequency: updatedTeam.session_frequency || 'disabled',
                session_days: updatedTeam.session_days || '',
                session_time: updatedTeam.session_time || '18:00',
                session_type: updatedTeam.session_type || 'training',
                session_location: updatedTeam.session_location || '',
                auto_session_creation_time: updatedTeam.auto_session_creation_time || '03:00',
                checkin_creation_day: updatedTeam.checkin_creation_day || 'mon',
                checkin_creation_time: updatedTeam.checkin_creation_time || '20:00',
                checkin_start_day: updatedTeam.checkin_start_day || 'fri',
                checkin_end_day: updatedTeam.checkin_end_day || 'tue',
            },
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PUT /api/team/settings' });
    }
};

/**
 * POST /api/team/settings/qr-code/upload  (auth + tenancy, owner only)
 * Upload QR code image for fund payments
 * Form data: { qr_code: File }
 */
const uploadQRCode = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const userId = req.user.id;

        if (!req.file) {
            throw new ValidationError('QR code image is required');
        }

        const storageService = require('../services/storageService');
        const { url, path } = await storageService.uploadQRCode(
            req.file.buffer,
            req.file.originalname,
            teamId
        );

        // Update team with new QR code URL
        await db('teams').where({ id: teamId }).update({
            fund_qr_code_url: url,
            updated_at: new Date()
        });

        logger.info('QR code uploaded', {
            team_id: teamId,
            uploaded_by: userId,
            file_name: req.file.originalname,
            storage_path: path
        });

        return res.status(200).json({
            message: 'QR code uploaded successfully',
            qr_code_url: url
        });
    } catch (error) {
        return handleError(error, req, res, {
            endpoint: 'POST /api/team/settings/qr-code/upload'
        });
    }
};

/**
 * DELETE /api/team/settings/qr-code  (auth + tenancy, owner only)
 * Remove QR code image for fund payments
 */
const deleteQRCode = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const userId = req.user.id;

        const team = await db('teams').where({ id: teamId }).first();

        if (!team || !team.fund_qr_code_url) {
            throw new NotFoundError('QR code not found');
        }

        // Delete from storage if possible (optional - mainly for cleanup)
        // Storage paths can be extracted from URLs if needed, but for now we'll just clear the URL
        await db('teams').where({ id: teamId }).update({
            fund_qr_code_url: null,
            updated_at: new Date()
        });

        logger.info('QR code deleted', {
            team_id: teamId,
            deleted_by: userId
        });

        return res.json({
            message: 'QR code deleted successfully'
        });
    } catch (error) {
        return handleError(error, req, res, {
            endpoint: 'DELETE /api/team/settings/qr-code'
        });
    }
};

module.exports = { createTeam, joinTeam, getInviteCode, regenerateInviteCode, listMembers, updateMemberRole, getSettings, updateSettings, uploadQRCode, deleteQRCode };
