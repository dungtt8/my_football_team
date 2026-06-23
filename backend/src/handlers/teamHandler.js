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

module.exports = { createTeam, joinTeam, getInviteCode, regenerateInviteCode, listMembers, updateMemberRole };
