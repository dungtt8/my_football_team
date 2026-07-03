const db = require('../config/database');
const approvalService = require('../services/approvalService');
const notificationService = require('../services/notificationService');
const {
  handleError,
  ValidationError,
  NotFoundError,
  ConflictError
} = require('../services/errorService');
const logger = require('../utils/logger');

/**
 * Create a new campaign
 * POST /api/campaigns
 * Body: { name, amount_per_member, deadline?, description? }
 */
const createCampaign = async (req, res) => {
  try {
    const { name, amount_per_member, deadline, description } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Campaign name is required');
    }

    if (typeof amount_per_member !== 'number' || amount_per_member <= 0) {
      throw new ValidationError('Amount per member must be a positive number');
    }

    logger.info('Creating campaign', {
      user_id: userId,
      team_id: teamId,
      name: name.substring(0, 50),
      amount_per_member
    });

    // Insert campaign
    const [campaignId] = await db('campaigns').insert({
      team_id: teamId,
      created_by: userId,
      name,
      amount_per_member,
      deadline: deadline ? new Date(deadline) : null,
      description: description || null,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Fetch created campaign
    const campaign = await db('campaigns')
      .where('id', campaignId)
      .first();

    // Get all active team members
    const activeMembers = await db('team_members')
      .where('team_id', teamId)
      .where('status', 'active')
      .select('user_id');

    logger.info('Found active team members for auto-assignment', {
      campaign_id: campaignId,
      team_id: teamId,
      member_count: activeMembers.length
    });

    // Auto-assign campaign to all active members
    if (activeMembers.length > 0) {
      const assignments = activeMembers.map(member => ({
        campaign_id: campaignId,
        user_id: member.user_id,
        status: 'pending_confirmation',
        created_at: new Date(),
        updated_at: new Date()
      }));

      await db('campaign_assignments').insert(assignments);

      logger.info('Campaign auto-assigned to active members', {
        campaign_id: campaignId,
        assignment_count: assignments.length
      });
    }

    // Emit campaign.created event
    await notificationService.emitEvent('campaign.created', {
      campaign_id: campaignId,
      team_id: teamId,
      created_by: userId,
      campaign_name: name,
      amount_per_member,
      member_count: activeMembers.length
    });

    logger.info('Campaign created successfully', {
      campaign_id: campaignId,
      team_id: teamId,
      user_id: userId
    });

    // Fetch assignments
    const assignments = await db('campaign_assignments')
      .where('campaign_id', campaignId);

    return res.status(201).json({
      id: campaignId,
      ...campaign,
      assignments
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns',
      method: 'POST'
    });
  }
};

/**
 * List campaigns with pagination
 * GET /api/campaigns?status=active&limit=10&offset=0
 */
const listCampaigns = async (req, res) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;
    const teamId = req.team.id;

    const parsedLimit = Math.min(parseInt(limit) || 10, 100);
    const parsedOffset = parseInt(offset) || 0;

    logger.info('Fetching campaigns', {
      team_id: teamId,
      status,
      limit: parsedLimit,
      offset: parsedOffset
    });

    let query = db('campaigns').where('team_id', teamId);

    if (status) {
      query = query.where('status', status);
    }

    const total = await query.clone().count('* as count').first();
    const campaigns = await query
      .orderBy('created_at', 'desc')
      .limit(parsedLimit)
      .offset(parsedOffset);

    return res.json({
      data: campaigns,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: total.count
      }
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns',
      method: 'GET'
    });
  }
};

/**
 * Get a single campaign with assignments
 * GET /api/campaigns/:id
 */
const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.team.id;

    logger.info('Fetching campaign', {
      campaign_id: id,
      team_id: teamId
    });

    // Fetch campaign
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    // Fetch assignments with user details
    const assignments = await db('campaign_assignments')
      .where('campaign_id', id)
      .join('users', 'campaign_assignments.user_id', 'users.id')
      .select(
        'campaign_assignments.*',
        'users.display_name',
        'users.zalo_user_id'
      );

    logger.info('Campaign fetched successfully', {
      campaign_id: id,
      team_id: teamId,
      assignment_count: assignments.length
    });

    return res.json({
      ...campaign,
      assignments
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id',
      method: 'GET'
    });
  }
};

/**
 * Member confirms campaign assignment
 * POST /api/campaigns/:id/assignments/:userId/confirm
 */
const memberConfirm = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { bill_image_url } = req.body;
    const memberId = req.user.id;
    const teamId = req.team.id;

    // Verify the requesting user is the one confirming
    if (parseInt(userId) !== memberId) {
      throw new ValidationError('Can only confirm your own assignment');
    }

    if (!bill_image_url || typeof bill_image_url !== 'string' || bill_image_url.trim().length === 0) {
      throw new ValidationError('Bill image URL is required as proof of payment');
    }

    logger.info('Member confirming campaign assignment', {
      campaign_id: id,
      user_id: memberId,
      team_id: teamId
    });

    // Fetch campaign to verify team_id
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    // Fetch assignment
    const assignment = await db('campaign_assignments')
      .where('campaign_id', id)
      .where('user_id', memberId)
      .first();

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (assignment.status !== 'pending_confirmation') {
      throw new ConflictError(`Assignment status is ${assignment.status}, cannot confirm`);
    }

    // Update assignment status with bill image proof
    await db('campaign_assignments')
      .where('id', assignment.id)
      .update({
        status: 'pending_approval',
        confirmed_at: new Date(),
        confirmed_by: memberId,
        bill_image_url: bill_image_url.trim(),
        updated_at: new Date()
      });

    // Fetch updated assignment
    const updatedAssignment = await db('campaign_assignments')
      .where('id', assignment.id)
      .first();

    // Fetch member name for the notification
    const member = await db('users').where('id', memberId).first();

    // Emit event - name must match the listener in inngest/handlers/campaignEvents.js
    // ('campaign.member_confirmed'), otherwise co-managers never get notified
    await notificationService.emitEvent('campaign.member_confirmed', {
      assignment_id: assignment.id,
      campaign_id: id,
      team_id: teamId,
      user_id: memberId,
      member_name: member?.full_name || member?.name || 'Thành viên',
      campaign_name: campaign.name
    });

    // Send notification to user
    try {
      const user = await db('users').where('id', memberId).first();
      await notificationService.sendInternalNotification(
        memberId,
        `You confirmed the campaign "${campaign.name}". Awaiting co-manager approval.`
      );
    } catch (notifError) {
      logger.warn('Failed to send notification', {
        user_id: memberId,
        error: notifError.message
      });
    }

    logger.info('Member confirmed assignment successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: memberId
    });

    return res.json(updatedAssignment);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id/assignments/:userId/confirm',
      method: 'POST'
    });
  }
};

/**
 * Member rejects campaign assignment
 * POST /api/campaigns/:id/assignments/:userId/reject
 * Body: { reason? }
 */
const memberReject = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { reason } = req.body;
    const memberId = req.user.id;
    const teamId = req.team.id;

    // Verify the requesting user is the one rejecting
    if (parseInt(userId) !== memberId) {
      throw new ValidationError('Can only reject your own assignment');
    }

    logger.info('Member rejecting campaign assignment', {
      campaign_id: id,
      user_id: memberId,
      team_id: teamId
    });

    // Fetch campaign
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    // Fetch assignment
    const assignment = await db('campaign_assignments')
      .where('campaign_id', id)
      .where('user_id', memberId)
      .first();

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (assignment.status !== 'pending_confirmation') {
      throw new ConflictError(`Assignment status is ${assignment.status}, cannot reject`);
    }

    // Update assignment status
    await db('campaign_assignments')
      .where('id', assignment.id)
      .update({
        status: 'rejected',
        rejected_at: new Date(),
        rejected_reason: reason || null,
        updated_at: new Date()
      });

    // Fetch updated assignment
    const updatedAssignment = await db('campaign_assignments')
      .where('id', assignment.id)
      .first();

    logger.info('Member rejected assignment successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: memberId
    });

    return res.json(updatedAssignment);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id/assignments/:userId/reject',
      method: 'POST'
    });
  }
};

/**
 * Co-manager approves campaign assignment
 * PATCH /api/campaigns/:id/assignments/:userId/approve
 * Body: { approval_notes? }
 */
const coManagerApprove = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { approval_notes } = req.body;
    const managerId = req.user.id;
    const teamId = req.team.id;

    logger.info('Co-manager approving campaign assignment', {
      campaign_id: id,
      user_id: userId,
      manager_id: managerId,
      team_id: teamId
    });

    // Fetch campaign
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    // Fetch assignment
    const assignment = await db('campaign_assignments')
      .where('campaign_id', id)
      .where('user_id', userId)
      .first();

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (assignment.status !== 'pending_approval') {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot approve`
      );
    }

    // Create auto-approved fund_transaction (income — member đóng tiền vào quỹ)
    const [transactionId] = await db('fund_transactions').insert({
      team_id: teamId,
      campaign_id: id,
      submitted_by: userId,
      amount: campaign.amount_per_member,
      description: `Đóng quỹ: ${campaign.name}`,
      transaction_type: 'income',
      status: 'approved',
      approved_by: managerId,
      approved_at: new Date(),
      bill_image_url: assignment.bill_image_url || null,
      transaction_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    logger.info('Auto-created fund transaction', {
      transaction_id: transactionId,
      campaign_id: id,
      user_id: userId,
      amount: campaign.amount_per_member
    });

    // Update assignment status and link transaction
    await db('campaign_assignments')
      .where('id', assignment.id)
      .update({
        status: 'approved',
        approved_by: managerId,
        approved_at: new Date(),
        approval_notes: approval_notes || null,
        transaction_id: transactionId,
        updated_at: new Date()
      });

    // Fetch updated assignment
    const updatedAssignment = await db('campaign_assignments')
      .where('id', assignment.id)
      .first();

    logger.info('Campaign assignment approved successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: userId,
      transaction_id: transactionId
    });

    return res.json(updatedAssignment);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id/assignments/:userId/approve',
      method: 'PATCH'
    });
  }
};

/**
 * Co-manager rejects campaign assignment
 * PATCH /api/campaigns/:id/assignments/:userId/reject
 * Body: { rejection_reason? }
 */
const coManagerReject = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { rejection_reason } = req.body;
    const managerId = req.user.id;
    const teamId = req.team.id;

    logger.info('Co-manager rejecting campaign assignment', {
      campaign_id: id,
      user_id: userId,
      manager_id: managerId,
      team_id: teamId
    });

    // Fetch campaign
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    // Fetch assignment
    const assignment = await db('campaign_assignments')
      .where('campaign_id', id)
      .where('user_id', userId)
      .first();

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (assignment.status !== 'pending_approval') {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot reject`
      );
    }

    // Call ApprovalService.rejectEntity (for consistency)
    await approvalService.rejectEntity(assignment.id, 'campaign_assignment', managerId, rejection_reason);

    // Fetch updated assignment
    const updatedAssignment = await db('campaign_assignments')
      .where('id', assignment.id)
      .first();

    logger.info('Campaign assignment rejected successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: userId
    });

    return res.json(updatedAssignment);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id/assignments/:userId/reject',
      method: 'PATCH'
    });
  }
};

/**
 * Co-manager exempts campaign assignment
 * PATCH /api/campaigns/:id/assignments/:userId/exempt
 * Body: { exempt_reason? }
 */
const coManagerExempt = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { exempt_reason } = req.body;
    const managerId = req.user.id;
    const teamId = req.team.id;

    logger.info('Co-manager exempting campaign assignment', {
      campaign_id: id,
      user_id: userId,
      manager_id: managerId,
      team_id: teamId
    });

    // Fetch campaign
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    // Fetch assignment
    const assignment = await db('campaign_assignments')
      .where('campaign_id', id)
      .where('user_id', userId)
      .first();

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    // Can exempt from pending_confirmation or pending_approval states
    const exemptableStatuses = ['pending_confirmation', 'pending_approval'];
    if (!exemptableStatuses.includes(assignment.status)) {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot exempt`
      );
    }

    // Update assignment status
    await db('campaign_assignments')
      .where('id', assignment.id)
      .update({
        status: 'exempt',
        exempt_at: new Date(),
        exempt_reason: exempt_reason || null,
        updated_at: new Date()
      });

    // Fetch updated assignment
    const updatedAssignment = await db('campaign_assignments')
      .where('id', assignment.id)
      .first();

    logger.info('Campaign assignment exempted successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: userId
    });

    return res.json(updatedAssignment);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id/assignments/:userId/exempt',
      method: 'PATCH'
    });
  }
};

/**
 * Close a campaign and calculate summary
 * POST /api/campaigns/:id/close
 */
const closeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.team.id;

    logger.info('Closing campaign', {
      campaign_id: id,
      team_id: teamId
    });

    // Fetch campaign
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    if (campaign.status === 'closed') {
      throw new ConflictError('Campaign is already closed');
    }

    // Update campaign status
    await db('campaigns')
      .where('id', id)
      .update({
        status: 'closed',
        closed_at: new Date(),
        updated_at: new Date()
      });

    // Fetch updated campaign
    const updatedCampaign = await db('campaigns')
      .where('id', id)
      .first();

    logger.info('Campaign closed successfully', {
      campaign_id: id,
      team_id: teamId
    });

    // Return campaign with summary
    return res.json(updatedCampaign);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id/close',
      method: 'POST'
    });
  }
};

/**
 * Get campaign report with statistics
 * GET /api/campaigns/:id/report
 */
const getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.team.id;

    logger.info('Fetching campaign report', {
      campaign_id: id,
      team_id: teamId
    });

    // Fetch campaign
    const campaign = await db('campaigns')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    // Get all assignments
    const assignments = await db('campaign_assignments')
      .where('campaign_id', id);

    // Calculate statistics
    const statusCounts = {
      pending_confirmation: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      exempt: 0
    };

    let totalApproved = 0;
    let totalApprovedAmount = 0;

    assignments.forEach(assignment => {
      statusCounts[assignment.status]++;
      if (assignment.status === 'approved') {
        totalApproved++;
        totalApprovedAmount += campaign.amount_per_member;
      }
    });

    const report = {
      campaign_id: id,
      campaign_name: campaign.name,
      total_members: assignments.length,
      amount_per_member: campaign.amount_per_member,
      expected_total: assignments.length * campaign.amount_per_member,
      approved_total: totalApprovedAmount,
      status_breakdown: statusCounts,
      approval_rate:
        assignments.length > 0
          ? ((totalApproved / assignments.length) * 100).toFixed(2) + '%'
          : '0%',
      campaign_status: campaign.status,
      deadline: campaign.deadline,
      closed_at: campaign.closed_at
    };

    logger.info('Campaign report generated', {
      campaign_id: id,
      total_members: assignments.length,
      approved_total: totalApprovedAmount
    });

    return res.json(report);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/campaigns/:id/report',
      method: 'GET'
    });
  }
};

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaign,
  memberConfirm,
  memberReject,
  coManagerApprove,
  coManagerReject,
  coManagerExempt,
  closeCampaign,
  getReport
};
