const db = require('../config/database');
const bcrypt = require('bcryptjs');
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
 * Verify password against hash
 * Handles both bcrypt hashes and plain text (for legacy/testing)
 */
const verifyPassword = async (plainPassword, hash) => {
    try {
        // Try bcrypt first (modern)
        return await bcrypt.compare(plainPassword, hash);
    } catch (e) {
        // Fallback: plain text comparison (for testing/legacy)
        return plainPassword === hash;
    }
};

/**
 * Hash password with bcrypt
 */
const hashPassword = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, 10);
};

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

        // Get all user's teams for JWT
        const allTeams = await getUserTeams(userId);

        // Issue new JWT with team context and all teams
        const token = authService.generateJWT(
            { id: userId, team_id: team.id, email: req.user.email, role: 'owner', zalo_user_id: req.user.zalo_user_id },
            allTeams
        );

        logger.info('Team created', { team_id: team.id, owner_id: userId, name: team.name });

        return res.status(201).json({
            token,
            team: { id: team.id, name: team.name, invite_code: team.invite_code },
            role: 'owner',
            teams: allTeams
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
                // Already in — just return a fresh token with all teams
                const allTeams = await getUserTeams(userId);
                const token = authService.generateJWT(
                    { id: userId, team_id: team.id, email: req.user.email, role: existing.role, zalo_user_id: req.user.zalo_user_id },
                    allTeams
                );
                return res.json({ token, team: { id: team.id, name: team.name }, role: existing.role, teams: allTeams });
            }
            // Reactivate
            await db('team_members').where({ id: existing.id }).update({ status: 'active', deactivated_at: null });
        } else {
            await db('team_members').insert({
                team_id: team.id, user_id: userId, role: 'member', status: 'active', created_at: new Date(),
            });
        }

        const role = existing?.role || 'member';

        // Get all user's teams for JWT
        const allTeams = await getUserTeams(userId);
        const token = authService.generateJWT(
            { id: userId, team_id: team.id, email: req.user.email, role, zalo_user_id: req.user.zalo_user_id },
            allTeams
        );

        logger.info('User joined team', { team_id: team.id, user_id: userId });

        return res.json({
            token,
            team: { id: team.id, name: team.name },
            role,
            teams: allTeams
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

/**
 * PUT /api/team/members/:memberId/deactivate  (auth + tenancy, owner/co_manager)
 * Deactivate a member (soft-pause, status → 'inactive')
 */
const deactivateMember = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const { memberId } = req.params;
        const callerId = req.user.user_id;
        const callerRole = req.user.role;

        // Permission check: only owner and co_manager can deactivate
        if (!['owner', 'co_manager'].includes(callerRole)) {
            throw new Error('Only owner and co_manager can manage members');
        }

        // Fetch the member to deactivate
        const member = await db('team_members')
            .where({ id: parseInt(memberId), team_id: teamId })
            .first();

        if (!member) {
            throw new NotFoundError('Team member not found');
        }

        // Prevent self-deactivation
        if (member.user_id === callerId) {
            throw new Error('Cannot deactivate yourself');
        }

        // Prevent deactivating owner
        if (member.role === 'owner') {
            throw new Error('Cannot deactivate team owner');
        }

        // Update member status to inactive
        const [updated] = await db('team_members')
            .where({ id: member.id })
            .update({
                status: 'inactive',
                deactivated_at: new Date(),
            })
            .returning('*');

        logger.info('Member deactivated', {
            team_id: teamId,
            member_id: member.id,
            user_id: member.user_id,
            deactivated_by: callerId,
        });

        return res.json(updated);
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PUT /api/team/members/:memberId/deactivate' });
    }
};

/**
 * PUT /api/team/members/:memberId/kick  (auth + tenancy, owner/co_manager)
 * Kick a member from team (hard-remove, status → 'kicked')
 */
const kickMember = async (req, res) => {
    try {
        const teamId = req.user.team_id;
        const { memberId } = req.params;
        const callerId = req.user.user_id;
        const callerRole = req.user.role;

        // Permission check: only owner and co_manager can kick
        if (!['owner', 'co_manager'].includes(callerRole)) {
            throw new Error('Only owner and co_manager can manage members');
        }

        // Fetch the member to kick
        const member = await db('team_members')
            .where({ id: parseInt(memberId), team_id: teamId })
            .first();

        if (!member) {
            throw new NotFoundError('Team member not found');
        }

        // Prevent self-kicking
        if (member.user_id === callerId) {
            throw new Error('Cannot kick yourself');
        }

        // Prevent kicking owner
        if (member.role === 'owner') {
            throw new Error('Cannot kick team owner');
        }

        // Update member status to kicked
        await db('team_members')
            .where({ id: member.id })
            .update({
                status: 'kicked',
                deleted_at: new Date(),
            });

        logger.info('Member kicked', {
            team_id: teamId,
            member_id: member.id,
            user_id: member.user_id,
            kicked_by: callerId,
        });

        return res.json({
            message: 'Member kicked successfully',
            member_id: member.id,
            team_id: teamId,
            user_id: member.user_id,
            status: 'kicked',
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PUT /api/team/members/:memberId/kick' });
    }
};

/**
 * PUT /api/members/jersey-number  (auth required, NO tenancy, self-update)
 * Member sets their own jersey number for a team
 */
const updateJerseyNumber = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { team_id, jersey_number } = req.body;

        if (!team_id) {
            throw new ValidationError('team_id is required');
        }

        // Validate jersey_number: must be positive integer or null
        if (jersey_number !== null && jersey_number !== undefined) {
            if (!Number.isInteger(jersey_number) || jersey_number <= 0) {
                throw new ValidationError('jersey_number must be a positive integer');
            }
            if (jersey_number > 9999999) {
                throw new ValidationError('jersey_number exceeds maximum value');
            }
        }

        // Verify user is member of team (active or inactive, not kicked)
        const member = await db('team_members')
            .where({ team_id, user_id: userId })
            .whereIn('status', ['active', 'inactive'])
            .first();

        if (!member) {
            throw new NotFoundError('User is not member of this team');
        }

        // Update jersey number
        const [updated] = await db('team_members')
            .where({ id: member.id })
            .update({ jersey_number: jersey_number || null })
            .returning('*');

        logger.info('Jersey number updated', {
            team_id,
            user_id: userId,
            jersey_number: jersey_number || null,
        });

        return res.json(updated);
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'PUT /api/members/jersey-number' });
    }
};

/**
 * PUT /api/profile
 * Update user profile (name, phone)
 * Body: { full_name?, phone? }
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { full_name, phone } = req.body;

        // Validate inputs
        if (full_name !== undefined && (!full_name || !full_name.trim())) {
            throw new ValidationError('Full name cannot be empty');
        }
        if (phone !== undefined && phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
            throw new ValidationError('Invalid phone format');
        }

        // Build update object
        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name.trim();
        if (phone !== undefined) updateData.phone = phone || null;

        // Update user
        const [updated] = await db('users')
            .where('id', userId)
            .update({ ...updateData, updated_at: new Date() })
            .returning('*');

        logger.info('Profile updated', { user_id: userId });

        return res.json({
            id: updated.id,
            email: updated.email,
            full_name: updated.full_name,
            phone: updated.phone,
        });
    } catch (error) {
        return handleError(error, req, res, {
            endpoint: 'PUT /api/profile',
            method: 'PUT'
        });
    }
};

/**
 * PUT /api/auth/password
 * Change user password
 * Body: { current_password, new_password, new_password_confirm }
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { current_password, new_password, new_password_confirm } = req.body;

        // Validate inputs
        if (!current_password) throw new ValidationError('Current password is required');
        if (!new_password) throw new ValidationError('New password is required');
        if (!new_password_confirm) throw new ValidationError('Password confirmation is required');
        if (new_password !== new_password_confirm) {
            throw new ValidationError('New passwords do not match');
        }
        if (new_password.length < 6) {
            throw new ValidationError('New password must be at least 6 characters');
        }
        if (new_password === current_password) {
            throw new ValidationError('New password must be different from current password');
        }

        // Get user
        const user = await db('users').where('id', userId).first();
        if (!user) throw new NotFoundError('User not found');

        // Verify current password
        const isPasswordValid = await verifyPassword(current_password, user.password_hash || '');
        if (!isPasswordValid) {
            throw new ValidationError('Current password is incorrect');
        }

        // Hash and update new password
        const hashedPassword = await hashPassword(new_password);
        await db('users')
            .where('id', userId)
            .update({ password_hash: hashedPassword, updated_at: new Date() });

        logger.info('Password changed', { user_id: userId });

        return res.json({ message: 'Password changed successfully' });
    } catch (error) {
        return handleError(error, req, res, {
            endpoint: 'PUT /api/auth/password',
            method: 'PUT'
        });
    }
};

/**
 * Helper: Get all teams for a user
 * Returns array of {id, name, role} for each team user is active in
 */
const getUserTeams = async (userId) => {
    const teams = await db('team_members as tm')
        .join('teams as t', 't.id', 'tm.team_id')
        .where({ 'tm.user_id': userId, 'tm.status': 'active' })
        .whereNull('tm.deleted_at')
        .whereNull('t.deleted_at')
        .select(
            't.id',
            't.name',
            'tm.role'
        )
        .orderBy('t.name');

    return teams;
};

/**
 * GET /api/user/teams  (auth required, NO tenancy)
 * List all teams user is a member/manager of
 * Returns: { teams: [{id, name, role}, ...], currentTeamId }
 */
const listUserTeams = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const currentTeamId = req.user.team_id;

        const teams = await getUserTeams(userId);

        if (teams.length === 0) {
            return res.json({
                teams: [],
                currentTeamId: null,
                message: 'No teams found. Create or join a team to get started.'
            });
        }

        logger.info('User teams listed', { user_id: userId, count: teams.length });

        return res.json({
            teams,
            currentTeamId,
            total: teams.length
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'GET /api/user/teams' });
    }
};

/**
 * POST /api/teams/:teamId/switch  (auth required, NO tenancy)
 * Switch current team context and get new JWT
 * Body: {} (empty)
 * Returns: { token, team: {id, name}, role, teams }
 */
const switchTeam = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const targetTeamId = parseInt(req.params.teamId, 10);

        // Verify user is member of target team
        const membership = await db('team_members')
            .where({ team_id: targetTeamId, user_id: userId, status: 'active' })
            .whereNull('deleted_at')
            .first();

        if (!membership) {
            throw new NotFoundError('You are not a member of this team or membership is inactive');
        }

        // Get team info
        const team = await db('teams').where({ id: targetTeamId }).whereNull('deleted_at').first();
        if (!team) throw new NotFoundError('Team not found');

        // Get all user's teams
        const allTeams = await getUserTeams(userId);

        // Generate new JWT with updated team_id
        const token = authService.generateJWT(
            {
                id: userId,
                team_id: targetTeamId,
                email: req.user.email,
                role: membership.role,
                zalo_user_id: req.user.zalo_user_id
            },
            allTeams
        );

        logger.info('Team switched', { user_id: userId, from_team: req.user.team_id, to_team: targetTeamId, role: membership.role });

        return res.json({
            token,
            team: { id: team.id, name: team.name },
            role: membership.role,
            teams: allTeams
        });
    } catch (error) {
        return handleError(error, req, res, { endpoint: 'POST /api/teams/:teamId/switch' });
    }
};

module.exports = {
    // Existing exports
    createTeam,
    joinTeam,
    getInviteCode,
    regenerateInviteCode,
    listMembers,
    updateMemberRole,
    getSettings,
    updateSettings,
    uploadQRCode,
    deleteQRCode,
    deactivateMember,
    kickMember,
    updateJerseyNumber,
    updateProfile,
    changePassword,
    // Multi-team exports
    listUserTeams,
    switchTeam,
    getUserTeams
};
