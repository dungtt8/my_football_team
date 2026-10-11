import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../attendance/gamification.service';
import { CheckinService } from '../attendance/checkin.service';
import { SessionSchedulingService } from '../attendance/session-scheduling.service';
import { FinanceClosingService } from '../finance/finance-closing.service';
import { NotificationService } from '../notification/notification.service';
import { TeamUsersService } from '../../common/services/team-users.service';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

const UTC = { timeZone: 'UTC' };

/**
 * Replaces the Inngest scheduled functions (backend/src/inngest/events.js +
 * handlers/monthlyReminder.js) with in-process @nestjs/schedule cron jobs.
 * All schedules are expressed in UTC (matching the original Inngest crons).
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    private readonly checkin: CheckinService,
    private readonly sessionScheduling: SessionSchedulingService,
    private readonly financeClosing: FinanceClosingService,
    private readonly notification: NotificationService,
    private readonly teamUsers: TeamUsersService,
  ) {}

  private getPreviousMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    if (month === 0) return `${year - 1}-12`;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatLeaderboardMessage(topUsers: any[]): string {
    let message = '🏆 BXH Tháng Này\n\n';
    topUsers.forEach((user, index) => {
      const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
      message += `${medal} ${user.full_name}\n${user.total_points} điểm\n\n`;
    });
    return message;
  }

  // ── attendance.auto-create-sessions — hourly ───────────────────────────────
  @Cron('0 * * * *', UTC)
  async autoCreateSessions(): Promise<void> {
    logger.info('[cron] attendance.auto-create-sessions started');
    try {
      const result = await this.sessionScheduling.processAutoSessions();
      logger.info('[cron] attendance.auto-create-sessions completed', { result });
    } catch (error: any) {
      logger.error('[cron] attendance.auto-create-sessions failed', {
        error: error.message,
      });
    }
  }

  // ── attendance.checkin-notifications — hourly ──────────────────────────────
  @Cron('0 * * * *', UTC)
  async checkInNotifications(): Promise<void> {
    logger.info('[cron] attendance.checkin-notifications started');
    try {
      const result = await this.checkin.checkAndCreateCheckInNotifications();
      logger.info('[cron] attendance.checkin-notifications completed', { result });
    } catch (error: any) {
      logger.error('[cron] attendance.checkin-notifications failed', {
        error: error.message,
      });
    }
  }

  // ── finance.payment-deadline-check — daily 01:00 UTC ───────────────────────
  @Cron('0 1 * * *', UTC)
  async financePaymentDeadlineCheck(): Promise<void> {
    logger.info('[cron] finance.payment-deadline-check started');
    try {
      await this.financeClosing.checkAndNotifyPaymentDeadline();
      logger.info('[cron] finance.payment-deadline-check completed');
    } catch (error: any) {
      logger.error('[cron] finance.payment-deadline-check failed', {
        error: error.message,
      });
    }
  }

  // ── fund.campaign-deadline-check — daily 23:00 UTC (placeholder no-op) ──────
  @Cron('0 23 * * *', UTC)
  async campaignDeadlineCheck(): Promise<void> {
    logger.info('[cron] fund.campaign-deadline-check started');
    logger.info('[cron] fund.campaign-deadline-check completed', {
      status: 'scheduled',
    });
  }

  // ── fund.monthly-reminder — 1st of month 01:00 UTC ─────────────────────────
  @Cron('0 1 1 * *', UTC)
  async monthlyReminder(): Promise<void> {
    logger.info('Monthly reminder job started');
    const previousMonth = this.getPreviousMonth();
    const currentMonth = this.getCurrentMonth();

    const teams = await this.prisma.teams.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true },
    });
    logger.info('Teams fetched for reminder', { count: teams.length });

    let totalArchived = 0;
    let totalNotifications = 0;

    for (const team of teams) {
      try {
        const archiveResult = await this.gamification.archiveMonthlyLeaderboard(
          team.id,
          previousMonth,
        );
        totalArchived++;
        logger.info('Leaderboard archived for team', {
          team_id: team.id,
          month: previousMonth,
          top_3_count: archiveResult.top_3.length,
        });

        const currentLeaderboard = await this.gamification.getLeaderboard(
          team.id,
          currentMonth,
        );
        const topThreeUsers = currentLeaderboard.slice(0, 3);

        const activeMembers = await this.teamUsers.getTeamUsers(team.id, {
          status: 'active',
          columns: ['u.id', 'u.zalo_user_id', 'u.full_name'],
        });

        const linkedMembers = activeMembers.filter((m: any) => m.zalo_user_id);

        for (const member of linkedMembers) {
          try {
            if (topThreeUsers.length > 0) {
              await this.notification.sendZaloMessage(
                member.zalo_user_id,
                'LEADERBOARD_SUMMARY',
                { topUsers: topThreeUsers },
              );
              totalNotifications++;
            }
          } catch (error: any) {
            logger.error('Failed to send leaderboard summary', {
              team_id: team.id,
              member_id: member.id,
              error: error.message,
            });
          }
        }

        const currentMonthDisplay = new Date().toLocaleString('vi-VN', {
          month: 'long',
          year: 'numeric',
        });
        for (const member of linkedMembers) {
          try {
            await this.notification.sendZaloMessage(
              member.zalo_user_id,
              'FUND_MONTHLY_REMINDER',
              {
                month: currentMonthDisplay,
                link: 'https://myteam.revonexus.net/fund',
              },
            );
            totalNotifications++;
          } catch (error: any) {
            logger.error('Failed to send fund reminder', {
              team_id: team.id,
              member_id: member.id,
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        logger.error('Failed to process team for archival and notification', {
          team_id: team.id,
          error: error.message,
        });
      }
    }

    logger.info('Monthly reminder job completed', {
      teamsProcessed: teams.length,
      leaderboardsArchived: totalArchived,
      notificationsSent: totalNotifications,
    });
  }

  // ── fund.auto-create-team-fund — daily 17:00 UTC ───────────────────────────
  // Running daily (not just on the 1st) makes this self-healing: a missed run
  // catches up on a later day inside the team's payment window, and the
  // fund_month check below prevents duplicates.
  @Cron('0 17 * * *', UTC)
  async autoCreateTeamFund(): Promise<void> {
    const currentMonth = this.getCurrentMonth();
    const currentDay = new Date().getDate();
    logger.info('Auto-create team fund job started', {
      month: currentMonth,
      day: currentDay,
    });

    const teams = await this.prisma.teams.findMany({
      where: {
        deleted_at: null,
        team_fund_amount: { not: null, gt: 0 },
      },
      select: {
        id: true,
        name: true,
        team_fund_amount: true,
        owner_id: true,
        finance_payment_start_day: true,
        finance_payment_end_day: true,
      },
    });
    logger.info('Teams eligible for team fund', { count: teams.length });

    let created = 0;
    let skipped = 0;

    for (const team of teams) {
      try {
        // Only inside the configured payment window (teams without one are
        // always eligible).
        const startDay = team.finance_payment_start_day;
        const endDay = team.finance_payment_end_day;
        if (startDay && endDay && (currentDay < startDay || currentDay > endDay)) {
          logger.info('Outside configured payment window, skipping for now', {
            team_id: team.id,
            day: currentDay,
            window: [startDay, endDay],
          });
          continue;
        }

        const existing = await this.prisma.campaigns.findFirst({
          where: {
            team_id: team.id,
            campaign_type: 'team_fund',
            fund_month: currentMonth,
          },
        });
        if (existing) {
          skipped++;
          logger.info('Team fund already created for this month', {
            team_id: team.id,
            month: currentMonth,
          });
          continue;
        }

        const { campaignId, activeMembers } = await this.prisma.$transaction(
          async (tx: any) => {
            const insertedCampaign = await tx.campaigns.create({
              data: {
                team_id: team.id,
                created_by: team.owner_id,
                name: `Quỹ đội tháng ${currentMonth}`,
                amount_per_member: team.team_fund_amount,
                campaign_type: 'team_fund',
                fund_month: currentMonth,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
            const members = await tx.team_members.findMany({
              where: { team_id: team.id, status: 'active' },
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
            return { campaignId: insertedCampaign.id, activeMembers: members };
          },
        );

        await this.notification.emitEvent('campaign.created', {
          campaign_id: campaignId,
          team_id: team.id,
          campaign_name: `Quỹ đội tháng ${currentMonth}`,
          amount_per_member: team.team_fund_amount,
          campaign_type: 'team_fund',
          fund_month: currentMonth,
        });

        created++;
        logger.info('Team fund campaign created', {
          team_id: team.id,
          campaign_id: campaignId,
          month: currentMonth,
          amount_per_member: team.team_fund_amount,
          member_count: activeMembers.length,
        });
      } catch (error: any) {
        logger.error('Failed to auto-create team fund for team', {
          team_id: team.id,
          error: error.message,
        });
      }
    }

    logger.info('Auto-create team fund job completed', {
      month: currentMonth,
      created,
      skipped,
    });
  }
}
