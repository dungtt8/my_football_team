import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ApprovalService } from '../finance/approval.service';
import { StorageService } from '../storage/storage.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentTeam } from '../../common/decorators/current-user.decorator';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/business-errors';
import { bi, toNum } from '../../common/utils/helpers';
import { imageMulterOptions } from '../../common/upload/multer-options';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/handlers/campaignHandler.js.
 */
@Controller('api/campaigns')
export class CampaignController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
    private readonly approval: ApprovalService,
    private readonly storage: StorageService,
  ) {}

  @Post('bill-image/upload')
  @Roles('member', 'co_manager', 'owner')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('bill_image', imageMulterOptions))
  async uploadBillImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const teamId = team.id;
    if (!file) throw new ValidationError('No image file uploaded');
    const { url } = await this.storage.uploadBillImage(
      file.buffer,
      file.originalname,
      teamId,
    );
    logger.info('Bill image uploaded', { user_id: user.id, team_id: teamId, url });
    return { url };
  }

  @Post()
  @Roles('co_manager', 'owner')
  async createCampaign(
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { name, amount_per_member, deadline, description } = body;
    const userId = user.id;
    const teamId = team.id;

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
      amount_per_member,
    });

    const { campaignId, campaign, activeMembers } = await this.prisma.$transaction(
      async (tx: any) => {
        const insertedCampaign = await tx.campaigns.create({
          data: {
            team_id: bi(teamId),
            created_by: bi(userId),
            name,
            amount_per_member,
            deadline: deadline ? new Date(deadline) : null,
            description: description || null,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        const members = await tx.team_members.findMany({
          where: { team_id: bi(teamId), status: 'active' },
          select: { user_id: true },
        });

        if (members.length > 0) {
          await tx.campaign_assignments.createMany({
            data: members.map((m: any) => ({
              campaign_id: insertedCampaign.id,
              user_id: m.user_id,
              status: 'pending_confirmation',
              created_at: new Date(),
              updated_at: new Date(),
            })),
          });
        }

        return {
          campaignId: insertedCampaign.id,
          campaign: insertedCampaign,
          activeMembers: members,
        };
      },
    );

    await this.notification.emitEvent('campaign.created', {
      campaign_id: campaignId,
      team_id: teamId,
      created_by: userId,
      campaign_name: name,
      amount_per_member,
      member_count: activeMembers.length,
    });

    logger.info('Campaign created successfully', {
      campaign_id: campaignId,
      team_id: teamId,
      user_id: userId,
    });

    const assignments = await this.prisma.campaign_assignments.findMany({
      where: { campaign_id: campaignId },
    });

    return { id: campaignId, ...campaign, assignments };
  }

  @Get()
  @Roles('member', 'co_manager', 'owner')
  async listCampaigns(@Query() query: any, @CurrentTeam() team: any) {
    const { status } = query;
    const teamId = team.id;
    const parsedLimit = Math.min(parseInt(query.limit) || 10, 100);
    const parsedOffset = parseInt(query.offset) || 0;

    const where: any = { team_id: bi(teamId) };
    if (status) where.status = status;

    const total = await this.prisma.campaigns.count({ where });
    const campaigns: any[] = await this.prisma.campaigns.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parsedLimit,
      skip: parsedOffset,
    });

    // Attach assignments so the client can tell whether the current user
    // still owes a payment without an extra round-trip per campaign.
    if (campaigns.length > 0) {
      const assignments = await this.prisma.campaign_assignments.findMany({
        where: { campaign_id: { in: campaigns.map((c) => c.id) } },
      });
      const byCampaign = new Map<string, any[]>();
      for (const a of assignments) {
        const key = String(a.campaign_id);
        if (!byCampaign.has(key)) byCampaign.set(key, []);
        byCampaign.get(key)!.push(a);
      }
      for (const c of campaigns) {
        c.assignments = byCampaign.get(String(c.id)) || [];
      }
    }

    return {
      data: campaigns,
      pagination: { limit: parsedLimit, offset: parsedOffset, total },
    };
  }

  @Get(':id')
  @Roles('member', 'co_manager', 'owner')
  async getCampaign(@Param('id') id: string, @CurrentTeam() team: any) {
    const teamId = team.id;
    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const assignments = await this.prisma.raw<any[]>(
      `SELECT ca.*, u.full_name, u.zalo_user_id
       FROM campaign_assignments ca
       JOIN users u ON ca.user_id = u.id
       WHERE ca.campaign_id = $1`,
      bi(id),
    );

    logger.info('Campaign fetched successfully', {
      campaign_id: id,
      team_id: teamId,
      assignment_count: assignments.length,
    });

    return { ...campaign, assignments };
  }

  @Post(':id/assignments/:userId/confirm')
  @Roles('member', 'co_manager', 'owner')
  @HttpCode(200)
  async memberConfirm(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { bill_image_url } = body;
    const memberId = user.id;
    const teamId = team.id;

    if (parseInt(userId) !== memberId) {
      throw new ValidationError('Can only confirm your own assignment');
    }
    if (
      !bill_image_url ||
      typeof bill_image_url !== 'string' ||
      bill_image_url.trim().length === 0
    ) {
      throw new ValidationError('Bill image URL is required as proof of payment');
    }

    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const assignment = await this.prisma.campaign_assignments.findFirst({
      where: { campaign_id: bi(id), user_id: bi(memberId) },
    });
    if (!assignment) throw new NotFoundError('Assignment not found');
    if (assignment.status !== 'pending_confirmation') {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot confirm`,
      );
    }

    await this.prisma.campaign_assignments.update({
      where: { id: assignment.id },
      data: {
        status: 'pending_approval',
        confirmed_at: new Date(),
        confirmed_by: bi(memberId),
        bill_image_url: bill_image_url.trim(),
        updated_at: new Date(),
      },
    });

    const updatedAssignment = await this.prisma.campaign_assignments.findUnique({
      where: { id: assignment.id },
    });

    const member = await this.prisma.users.findUnique({
      where: { id: bi(memberId) },
    });

    await this.notification.emitEvent('campaign.member_confirmed', {
      assignment_id: assignment.id,
      campaign_id: id,
      team_id: teamId,
      user_id: memberId,
      member_name: member?.full_name || 'Thành viên',
      campaign_name: campaign.name,
    });

    try {
      await this.notification.sendInternalNotification(
        memberId,
        `You confirmed the campaign "${campaign.name}". Awaiting co-manager approval.`,
        {},
        teamId,
      );
    } catch (notifError: any) {
      logger.warn('Failed to send notification', {
        user_id: memberId,
        error: notifError.message,
      });
    }

    logger.info('Member confirmed assignment successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: memberId,
    });
    return updatedAssignment;
  }

  @Post(':id/assignments/:userId/reject')
  @Roles('member', 'co_manager', 'owner')
  @HttpCode(200)
  async memberReject(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { reason } = body;
    const memberId = user.id;
    const teamId = team.id;

    if (parseInt(userId) !== memberId) {
      throw new ValidationError('Can only reject your own assignment');
    }

    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const assignment = await this.prisma.campaign_assignments.findFirst({
      where: { campaign_id: bi(id), user_id: bi(memberId) },
    });
    if (!assignment) throw new NotFoundError('Assignment not found');
    if (assignment.status !== 'pending_confirmation') {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot reject`,
      );
    }

    await this.prisma.campaign_assignments.update({
      where: { id: assignment.id },
      data: {
        status: 'rejected',
        rejected_at: new Date(),
        rejected_reason: reason || null,
        updated_at: new Date(),
      },
    });

    const updatedAssignment = await this.prisma.campaign_assignments.findUnique({
      where: { id: assignment.id },
    });
    logger.info('Member rejected assignment successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: memberId,
    });
    return updatedAssignment;
  }

  @Patch(':id/assignments/:userId/approve')
  @Roles('co_manager', 'owner')
  async coManagerApprove(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { approval_notes, amount } = body;
    const managerId = user.id;
    const teamId = team.id;

    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const assignment = await this.prisma.campaign_assignments.findFirst({
      where: { campaign_id: bi(id), user_id: bi(userId) },
    });
    if (!assignment) throw new NotFoundError('Assignment not found');
    if (assignment.status !== 'pending_approval') {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot approve`,
      );
    }

    // Manager can override the collected amount (e.g. teams whose members
    // don't all owe the same amount). Falls back to the campaign's default.
    let approvedAmount = campaign.amount_per_member;
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        throw new ValidationError('Amount must be a positive number');
      }
      approvedAmount = amount;
    }

    // Auto-approved income transaction (member đóng tiền vào quỹ)
    const transaction = await this.prisma.fund_transactions.create({
      data: {
        team_id: bi(teamId),
        campaign_id: bi(id),
        submitted_by: bi(userId),
        amount: approvedAmount,
        description: `Đóng quỹ: ${campaign.name}`,
        transaction_type: 'income',
        status: 'approved',
        approved_by: bi(managerId),
        approved_at: new Date(),
        bill_image_url: assignment.bill_image_url || null,
        transaction_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    logger.info('Auto-created fund transaction', {
      transaction_id: transaction.id,
      campaign_id: id,
      user_id: userId,
      amount: approvedAmount,
    });

    await this.prisma.campaign_assignments.update({
      where: { id: assignment.id },
      data: {
        status: 'approved',
        approved_by: bi(managerId),
        approved_at: new Date(),
        approval_notes: approval_notes || null,
        approved_amount: approvedAmount,
        transaction_id: transaction.id,
        updated_at: new Date(),
      },
    });

    const updatedAssignment = await this.prisma.campaign_assignments.findUnique({
      where: { id: assignment.id },
    });
    logger.info('Campaign assignment approved successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: userId,
      transaction_id: transaction.id,
    });
    return updatedAssignment;
  }

  @Patch(':id/assignments/:userId/reject')
  @Roles('co_manager', 'owner')
  async coManagerReject(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { rejection_reason } = body;
    const managerId = user.id;
    const teamId = team.id;

    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const assignment = await this.prisma.campaign_assignments.findFirst({
      where: { campaign_id: bi(id), user_id: bi(userId) },
    });
    if (!assignment) throw new NotFoundError('Assignment not found');
    if (assignment.status !== 'pending_approval') {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot reject`,
      );
    }

    await this.approval.rejectEntity(
      assignment.id,
      'campaign_assignment',
      managerId,
      rejection_reason,
    );

    const updatedAssignment = await this.prisma.campaign_assignments.findUnique({
      where: { id: assignment.id },
    });
    logger.info('Campaign assignment rejected successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: userId,
    });
    return updatedAssignment;
  }

  @Patch(':id/assignments/:userId/exempt')
  @Roles('co_manager', 'owner')
  async coManagerExempt(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { exempt_reason } = body;
    const teamId = team.id;

    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const assignment = await this.prisma.campaign_assignments.findFirst({
      where: { campaign_id: bi(id), user_id: bi(userId) },
    });
    if (!assignment) throw new NotFoundError('Assignment not found');

    const exemptableStatuses = ['pending_confirmation', 'pending_approval'];
    if (!exemptableStatuses.includes(assignment.status)) {
      throw new ConflictError(
        `Assignment status is ${assignment.status}, cannot exempt`,
      );
    }

    await this.prisma.campaign_assignments.update({
      where: { id: assignment.id },
      data: {
        status: 'exempt',
        exempt_at: new Date(),
        exempt_reason: exempt_reason || null,
        updated_at: new Date(),
      },
    });

    const updatedAssignment = await this.prisma.campaign_assignments.findUnique({
      where: { id: assignment.id },
    });
    logger.info('Campaign assignment exempted successfully', {
      assignment_id: assignment.id,
      campaign_id: id,
      user_id: userId,
    });
    return updatedAssignment;
  }

  @Post(':id/close')
  @Roles('co_manager', 'owner')
  @HttpCode(200)
  async closeCampaign(@Param('id') id: string, @CurrentTeam() team: any) {
    const teamId = team.id;

    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);
    if (campaign.status === 'closed') {
      throw new ConflictError('Campaign is already closed');
    }

    await this.prisma.campaigns.update({
      where: { id: bi(id) },
      data: { status: 'closed', closed_at: new Date(), updated_at: new Date() },
    });

    const updatedCampaign = await this.prisma.campaigns.findUnique({
      where: { id: bi(id) },
    });

    logger.info('Campaign closed successfully', {
      campaign_id: id,
      team_id: teamId,
    });

    await this.notification.emitEvent('campaign.closed', {
      campaign_id: id,
      team_id: teamId,
    });

    return updatedCampaign;
  }

  @Get(':id/report')
  @Roles('co_manager', 'owner')
  async getReport(@Param('id') id: string, @CurrentTeam() team: any) {
    const teamId = team.id;

    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const assignments = await this.prisma.campaign_assignments.findMany({
      where: { campaign_id: bi(id) },
    });

    const statusCounts: Record<string, number> = {
      pending_confirmation: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      exempt: 0,
    };
    const amountPerMember = toNum(campaign.amount_per_member);
    let totalApproved = 0;
    let totalApprovedAmount = 0;

    for (const a of assignments) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      if (a.status === 'approved') {
        totalApproved++;
        // Manager may have overridden the amount at approval time.
        totalApprovedAmount += a.approved_amount != null
          ? toNum(a.approved_amount)
          : amountPerMember;
      }
    }

    const report = {
      campaign_id: id,
      campaign_name: campaign.name,
      total_members: assignments.length,
      amount_per_member: campaign.amount_per_member,
      expected_total: assignments.length * amountPerMember,
      approved_total: totalApprovedAmount,
      status_breakdown: statusCounts,
      approval_rate:
        assignments.length > 0
          ? ((totalApproved / assignments.length) * 100).toFixed(2) + '%'
          : '0%',
      campaign_status: campaign.status,
      deadline: campaign.deadline,
      closed_at: campaign.closed_at,
    };

    logger.info('Campaign report generated', {
      campaign_id: id,
      total_members: assignments.length,
      approved_total: totalApprovedAmount,
    });
    return report;
  }
}
