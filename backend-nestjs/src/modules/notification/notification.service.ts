import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ZaloService } from '../zalo/zalo.service';
import { TeamUsersService } from '../../common/services/team-users.service';
import logger from '../../common/utils/logger';
import { bi, toNum, currentMonthString } from '../../common/utils/helpers';
import { buildTextFromTemplate } from '../../common/utils/zalo-templates';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Port of backend/src/services/notificationService.js.
 *
 * The Inngest event bus is replaced with a local in-process dispatcher:
 * `emitEvent(name, data)` runs the equivalent handler logic directly (the same
 * logic that previously lived in backend/src/inngest/handlers/*). It is
 * fire-and-forget — it never throws — matching the original emitEvent
 * semantics (a notification/side-effect failure must never fail the caller).
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zalo: ZaloService,
    private readonly teamUsers: TeamUsersService,
  ) {}

  // ── Primitive helpers ──────────────────────────────────────────────────────

  async sendZaloMessage(
    zaloUserId: string,
    templateId: string,
    params: any,
  ): Promise<any> {
    try {
      if (!zaloUserId) {
        logger.warn('Zalo message send skipped', {
          template_id: templateId,
          reason: 'zaloUserId is required (received null/undefined)',
        });
        throw new Error('zaloUserId is required (received null/undefined)');
      }
      const user = await this.prisma.users.findFirst({
        where: { zalo_user_id: zaloUserId },
      });
      if (!user) {
        const err = `User with zaloUserId ${zaloUserId} not found`;
        logger.warn('Zalo message send failed', {
          zalo_user_id: zaloUserId,
          template_id: templateId,
          reason: err,
        });
        throw new Error(err);
      }
      const text = buildTextFromTemplate(templateId, params);
      const response = await this.zalo.sendMessage(zaloUserId, text);
      logger.info('Zalo message queued successfully', {
        zalo_user_id: zaloUserId,
        template_id: templateId,
        user_id: user.id,
      });
      return response;
    } catch (error: any) {
      logger.error('Failed to send Zalo message', {
        zalo_user_id: zaloUserId,
        template_id: templateId,
        error: error.message,
      });
      throw error;
    }
  }

  /** Send a templated Zalo message to many chat ids (rate-limited). */
  async sendBatchNotifications(
    zaloUserIds: string[],
    templateId: string,
    params: any,
  ): Promise<{ successful: any[]; failed: any[] }> {
    const results: { successful: any[]; failed: any[] } = {
      successful: [],
      failed: [],
    };
    const users = await this.prisma.users.findMany({
      where: { zalo_user_id: { in: zaloUserIds } },
      select: { zalo_user_id: true },
    });
    const found = new Set(users.map((u: any) => u.zalo_user_id));
    const text = buildTextFromTemplate(templateId, params);

    for (const zaloUserId of zaloUserIds) {
      if (!found.has(zaloUserId)) {
        results.failed.push({ zalo_user_id: zaloUserId, error: 'User not found' });
        continue;
      }
      try {
        const response = await this.zalo.sendMessage(zaloUserId, text);
        results.successful.push({ zalo_user_id: zaloUserId, response });
        await sleep(150); // stay under Zalo's per-minute message limit
      } catch (error: any) {
        results.failed.push({ zalo_user_id: zaloUserId, error: error.message });
        logger.error('Failed to send batch notification to user', {
          zalo_user_id: zaloUserId,
          template_id: templateId,
          error: error.message,
        });
      }
    }
    return results;
  }

  async sendInternalNotification(
    userId: number | string | bigint,
    message: string,
    metadata: any = {},
    teamId: number | string | bigint | null = null,
  ): Promise<any> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: bi(userId) },
      });
      if (!user) {
        const err = `User with ID ${userId} not found`;
        logger.warn('Internal notification send failed', {
          user_id: userId,
          reason: err,
        });
        throw new Error(err);
      }

      let resolvedTeamId = teamId;
      if (!resolvedTeamId) {
        const membership = await this.prisma.team_members.findFirst({
          where: { user_id: bi(userId), status: 'active' },
        });
        resolvedTeamId = membership?.team_id ?? null;
      }
      if (!resolvedTeamId) {
        throw new Error(`Could not resolve team_id for user ${userId}`);
      }

      const notification = await this.prisma.notifications.create({
        data: {
          user_id: bi(userId),
          team_id: bi(resolvedTeamId),
          message,
          metadata,
          is_read: false,
        },
      });

      logger.info('Internal notification stored', {
        user_id: userId,
        team_id: resolvedTeamId,
        notification_id: notification.id,
      });
      return notification;
    } catch (error: any) {
      logger.error('Failed to store internal notification', {
        user_id: userId,
        error: error.message,
      });
      throw error;
    }
  }

  async broadcastNotification(notification: any): Promise<{
    successful: number;
    failed: number;
  }> {
    const { team_id, message, title, data } = notification;
    const results = { successful: 0, failed: 0 };
    if (!team_id || !message) {
      throw new Error('broadcastNotification requires team_id and message');
    }
    const members = await this.teamUsers.getTeamUsers(team_id, {
      status: 'active',
    });
    if (members.length === 0) return results;

    const finalMessage = title ? `${title}: ${message}` : message;
    try {
      await this.prisma.notifications.createMany({
        data: members.map((member: any) => ({
          user_id: member.id,
          team_id: bi(team_id),
          message: finalMessage,
          metadata: data || {},
          is_read: false,
        })),
      });
      results.successful = members.length;
    } catch (error: any) {
      results.failed = members.length;
      logger.error('Failed to broadcast notification', {
        team_id,
        error: error.message,
      });
    }
    logger.info('Broadcast notification completed', {
      team_id,
      successful: results.successful,
      failed: results.failed,
    });
    return results;
  }

  // ── Event dispatcher (replaces Inngest) ─────────────────────────────────────

  /**
   * Fire-and-forget local dispatch. Mirrors the old
   * notificationService.emitEvent() which sent to Inngest and never threw.
   * Errors are logged and swallowed.
   */
  async emitEvent(eventName: string, data: any): Promise<void> {
    try {
      switch (eventName) {
        case 'approval.pending':
          await this.onApprovalPending(data);
          break;
        case 'approval.approved':
          await this.onApprovalApproved(data);
          break;
        case 'approval.rejected':
          await this.onApprovalRejected(data);
          break;
        case 'campaign.created':
          await this.onCampaignCreated(data);
          break;
        case 'campaign.member_confirmed':
          await this.onCampaignMemberConfirmed(data);
          break;
        case 'campaign.closed':
          await this.onCampaignClosed(data);
          break;
        case 'attendance.session_created':
          await this.onSessionCreated(data);
          break;
        case 'attendance.session_closed':
          await this.onSessionClosed(data);
          break;
        default:
          logger.info('emitEvent: no local handler for event', {
            event_name: eventName,
          });
      }
    } catch (error: any) {
      logger.error('emitEvent handler failed (swallowed)', {
        event_name: eventName,
        error: error.message,
      });
    }
  }

  // ── Finance approval handlers (from inngest/handlers/financeEvents.js) ──────

  private async onApprovalPending(data: any): Promise<void> {
    const { entity_type, entity_id, team_id, submitted_by } = data;
    if (entity_type !== 'transaction') return;

    const transaction = await this.prisma.fund_transactions.findFirst({
      where: { id: bi(entity_id), team_id: bi(team_id) },
    });
    if (!transaction) throw new Error(`Transaction ${entity_id} not found`);

    const submitterId = submitted_by ?? transaction.submitted_by;
    const submitter = await this.prisma.users.findUnique({
      where: { id: bi(submitterId) },
    });
    if (!submitter) throw new Error(`Submitter ${submitterId} not found`);

    const coManagers = await this.teamUsers.getTeamUsers(team_id, {
      role: ['owner', 'co_manager'],
      status: 'active',
    });
    for (const coManager of coManagers) {
      try {
        await this.sendZaloMessage(
          coManager.zalo_user_id,
          'TRANSACTION_PENDING_APPROVAL',
          {
            submitter_name: submitter.full_name,
            amount: transaction.amount.toString(),
            transaction_id: transaction.id.toString(),
          },
        );
      } catch (error: any) {
        logger.error('Failed to notify co-manager of pending approval', {
          co_manager_id: coManager.id,
          team_id,
          error: error.message,
        });
      }
    }
  }

  private async onApprovalApproved(data: any): Promise<void> {
    const { entity_type, entity_id, team_id, submitted_by, approved_by } = data;
    if (entity_type !== 'transaction') return;

    const transaction = await this.prisma.fund_transactions.findFirst({
      where: { id: bi(entity_id), team_id: bi(team_id) },
    });
    if (!transaction) throw new Error(`Transaction ${entity_id} not found`);

    const submitterId = submitted_by ?? transaction.submitted_by;
    const submitter = await this.prisma.users.findUnique({
      where: { id: bi(submitterId) },
    });
    const approver = approved_by
      ? await this.prisma.users.findUnique({ where: { id: bi(approved_by) } })
      : null;
    if (!submitter) throw new Error(`Submitter ${submitterId} not found`);

    // Recompute balances (income - expense) excluding this transaction, then
    // write an audit row to fund_balance_logs.
    const agg = await this.prisma.raw<any[]>(
      `SELECT
         SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) AS total_income,
         SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS total_expense
       FROM fund_transactions
       WHERE team_id = $1 AND status = 'approved' AND id <> $2`,
      bi(team_id),
      bi(entity_id),
    );
    const previousBalance =
      toNum(agg[0]?.total_income) - toNum(agg[0]?.total_expense);
    const changeAmount =
      transaction.transaction_type === 'income'
        ? toNum(transaction.amount)
        : -toNum(transaction.amount);
    const newBalance = previousBalance + changeAmount;

    const log = await this.prisma.fund_balance_logs.create({
      data: {
        team_id: bi(team_id),
        transaction_id: bi(entity_id),
        previous_balance: previousBalance,
        new_balance: newBalance,
        change_amount: changeAmount,
        description: `Transaction #${entity_id} approved by ${approver?.full_name ?? 'system'}`,
      },
    });
    logger.info('Fund balance log created', {
      log_id: log.id,
      team_id,
      previous_balance: previousBalance,
      new_balance: newBalance,
    });

    // Notify submitter
    try {
      await this.sendZaloMessage(submitter.zalo_user_id, 'TRANSACTION_APPROVED', {
        amount: transaction.amount.toString(),
        transaction_id: transaction.id.toString(),
        approved_by: approver?.full_name ?? '',
      });
    } catch (error: any) {
      logger.error('Failed to notify submitter of approval', {
        error: error.message,
      });
    }

    // FUND_UPDATED to team managers (owner + co_manager) except the submitter
    const members = await this.teamUsers.getTeamUsers(team_id, {
      role: ['owner', 'co_manager'],
      status: 'active',
      excludeUserId: submitterId,
    });
    for (const member of members) {
      try {
        await this.sendZaloMessage(member.zalo_user_id, 'FUND_UPDATED', {
          new_balance: newBalance.toString(),
          change_amount: changeAmount.toString(),
          transaction_id: transaction.id.toString(),
        });
      } catch (error: any) {
        logger.error('Failed to send fund update notification', {
          member_id: member.id,
          error: error.message,
        });
      }
    }
  }

  private async onApprovalRejected(data: any): Promise<void> {
    const { entity_type, entity_id, team_id, rejected_by, reason } = data;
    if (entity_type !== 'transaction') return;

    const transaction = await this.prisma.fund_transactions.findFirst({
      where: { id: bi(entity_id), team_id: bi(team_id) },
    });
    if (!transaction) throw new Error(`Transaction ${entity_id} not found`);

    const submitter = await this.prisma.users.findUnique({
      where: { id: bi(transaction.submitted_by) },
    });
    const rejector = rejected_by
      ? await this.prisma.users.findUnique({ where: { id: bi(rejected_by) } })
      : null;
    if (!submitter) return;

    try {
      await this.sendZaloMessage(submitter.zalo_user_id, 'TRANSACTION_REJECTED', {
        amount: transaction.amount.toString(),
        transaction_id: transaction.id.toString(),
        rejected_by: rejector?.full_name ?? '',
        reason: reason || 'No reason provided',
      });
    } catch (error: any) {
      logger.error('Failed to notify submitter of rejection', {
        error: error.message,
      });
    }
  }

  // ── Campaign handlers (from inngest/handlers/campaignEvents.js) ─────────────

  private async onCampaignCreated(data: any): Promise<void> {
    const { campaign_id, team_id, created_by } = data;
    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(campaign_id), team_id: bi(team_id) },
    });
    if (!campaign) throw new Error(`Campaign ${campaign_id} not found`);

    const creator = created_by
      ? await this.prisma.users.findUnique({ where: { id: bi(created_by) } })
      : null;

    const members = await this.teamUsers.getTeamUsers(team_id, {
      status: 'active',
    });
    for (const member of members) {
      try {
        await this.sendZaloMessage(member.zalo_user_id, 'CAMPAIGN_CREATED', {
          campaign_name: campaign.name,
          amount_per_member: campaign.amount_per_member.toString(),
          deadline: campaign.deadline
            ? new Date(campaign.deadline).toLocaleDateString('vi-VN')
            : 'No deadline',
          created_by: creator?.full_name || 'Hệ thống',
        });
      } catch (error: any) {
        logger.error('Failed to send campaign created notification', {
          member_id: member.id,
          team_id,
          error: error.message,
        });
      }
    }
  }

  private async onCampaignMemberConfirmed(data: any): Promise<void> {
    const { campaign_id, team_id, member_name } = data;
    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(campaign_id), team_id: bi(team_id) },
    });
    if (!campaign) throw new Error(`Campaign ${campaign_id} not found`);

    const coManagers = await this.teamUsers.getTeamUsers(team_id, {
      role: ['owner', 'co_manager'],
      status: 'active',
    });
    for (const coManager of coManagers) {
      try {
        await this.sendZaloMessage(
          coManager.zalo_user_id,
          'MEMBER_CONFIRMED_CAMPAIGN',
          { member_name, campaign_name: campaign.name },
        );
      } catch (error: any) {
        logger.error('Failed to notify co-manager of member confirm', {
          co_manager_id: coManager.id,
          team_id,
          error: error.message,
        });
      }
    }
  }

  private async onCampaignClosed(data: any): Promise<void> {
    const { campaign_id, team_id } = data;
    const campaign = await this.prisma.campaigns.findFirst({
      where: { id: bi(campaign_id), team_id: bi(team_id) },
    });
    if (!campaign) throw new Error(`Campaign ${campaign_id} not found`);

    const assignments = await this.prisma.campaign_assignments.findMany({
      where: { campaign_id: bi(campaign_id) },
    });

    let totalCharged = 0;
    let membersConfirmed = 0;
    let membersRejected = 0;
    let membersExempt = 0;
    for (const a of assignments) {
      if (a.status === 'approved' && a.transaction_id) {
        const tx = await this.prisma.fund_transactions.findUnique({
          where: { id: a.transaction_id },
        });
        if (tx) totalCharged += toNum(tx.amount);
      } else if (a.status === 'approved') {
        membersConfirmed++;
      } else if (a.status === 'rejected') {
        membersRejected++;
      } else if (a.status === 'exempt') {
        membersExempt++;
      }
    }
    const statistics = {
      totalCharged,
      membersConfirmed,
      membersRejected,
      membersExempt,
      totalMembers: assignments.length,
    };

    const members = await this.teamUsers.getTeamUsers(team_id, {
      status: 'active',
    });
    for (const member of members) {
      try {
        await this.sendZaloMessage(
          member.zalo_user_id,
          'CAMPAIGN_CLOSED_SUMMARY',
          {
            campaign_name: campaign.name,
            total_charged: statistics.totalCharged.toString(),
            members_confirmed: statistics.membersConfirmed.toString(),
            members_rejected: statistics.membersRejected.toString(),
            members_exempt: statistics.membersExempt.toString(),
            total_members: statistics.totalMembers.toString(),
          },
        );
      } catch (error: any) {
        logger.error('Failed to send campaign summary', {
          member_id: member.id,
          team_id,
          error: error.message,
        });
      }
    }
  }

  // ── Attendance handlers (from inngest/handlers/attendanceEvents.js) ─────────

  private async onSessionCreated(data: any): Promise<void> {
    const { session_id, team_id } = data;
    const session = await this.prisma.attendance_sessions.findFirst({
      where: { id: bi(session_id), team_id: bi(team_id) },
    });
    if (!session) throw new Error(`Session ${session_id} not found`);

    const members = await this.teamUsers.getTeamUsers(team_id, {
      status: 'active',
    });
    for (const member of members) {
      try {
        await this.sendZaloMessage(member.zalo_user_id, 'SESSION_CREATED', {
          session_date: new Date(session.session_date).toLocaleDateString(
            'vi-VN',
          ),
          location: session.location || 'TBD',
          session_type: session.session_type === 'training' ? 'Training' : 'Match',
        });
      } catch (error: any) {
        logger.error('Failed to send session created notification', {
          member_id: member.id,
          team_id,
          error: error.message,
        });
      }
    }
  }

  /**
   * Port of onSessionClosedHandler: members who did not answer 'yes' are
   * marked absent ('no') with a -5 point penalty, then everyone gets a summary.
   */
  private async onSessionClosed(data: any): Promise<void> {
    const { session_id, team_id } = data;
    const session = await this.prisma.attendance_sessions.findFirst({
      where: { id: bi(session_id), team_id: bi(team_id) },
    });
    if (!session) throw new Error(`Session ${session_id} not found`);

    const members = await this.teamUsers.getTeamUsers(team_id, {
      status: 'active',
    });
    const records = await this.prisma.attendance_checkins.findMany({
      where: { session_id: bi(session_id) },
      select: { user_id: true, response: true },
    });
    const attended = new Set(
      records.filter((r: any) => r.response === 'yes').map((r: any) => String(r.user_id)),
    );

    const month = currentMonthString();
    const now = new Date();
    const absentees = members.filter((m: any) => !attended.has(String(m.id)));
    if (absentees.length > 0) {
      const ids = absentees.map((m: any) => bi(m.id));
      await this.prisma.attendance_checkins.updateMany({
        where: { session_id: bi(session_id), user_id: { in: ids } },
        data: { response: 'no', responded_at: now, updated_at: now },
      });
      await this.prisma.user_points.createMany({
        data: ids.map((id: any) => ({
          user_id: id,
          team_id: bi(team_id),
          points: -5,
          reason: 'absence_penalty',
          month,
          created_at: now,
        })),
      });
    }

    const stats = {
      attended_count: attended.size,
      absent_count: absentees.length,
      total_members: members.length,
    };
    for (const member of members) {
      try {
        await this.sendZaloMessage(member.zalo_user_id, 'SESSION_CLOSED_SUMMARY', {
          session_type: session.session_type === 'training' ? 'Training' : 'Match',
          attended_count: stats.attended_count.toString(),
          absent_count: stats.absent_count.toString(),
          total_members: stats.total_members.toString(),
          user_status: attended.has(String(member.id)) ? 'attended' : 'absent',
        });
      } catch (error: any) {
        logger.error('Failed to send session closed summary', {
          member_id: member.id,
          team_id,
          session_id,
          error: error.message,
        });
      }
    }
  }
}
