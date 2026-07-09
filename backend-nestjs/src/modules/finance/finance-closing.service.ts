import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/services/financeClosingService.js.
 */
@Injectable()
export class FinanceClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  static getCurrentMonthString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /** Whether `day` is within [startDay, endDay] (both 1-31), wrapping supported. */
  static isDayInRange(day: number, startDay?: number, endDay?: number): boolean {
    if (!startDay || !endDay) return false;
    if (startDay <= endDay) return day >= startDay && day <= endDay;
    return day >= startDay || day <= endDay;
  }

  static calculateDaysRemaining(endDay: number, startDay: number | null = null): number {
    const today = new Date();
    const currentDay = today.getDate();
    const wraps = startDay != null && startDay > endDay;

    if (!wraps) {
      if (currentDay > endDay) return 0;
      return endDay - currentDay;
    }
    if (currentDay >= startDay!) {
      const daysInCurrentMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      return daysInCurrentMonth - currentDay + endDay;
    }
    if (currentDay > endDay) return 0;
    return endDay - currentDay;
  }

  async checkAndNotifyPaymentDeadline(): Promise<void> {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = FinanceClosingService.getCurrentMonthString();

      const teams = await this.prisma.teams.findMany({
        where: {
          finance_payment_start_day: currentDay,
          finance_payment_end_day: { not: null },
          deleted_at: null,
        },
      });

      logger.info(
        `Found ${teams.length} teams with payment deadline starting today (day ${currentDay})`,
      );

      for (const team of teams) {
        try {
          if (team.finance_payment_notified_month === currentMonth) {
            logger.info(
              `Team ${team.id} already notified for ${currentMonth}, skipping`,
            );
            continue;
          }

          const members = await this.prisma.team_members.findMany({
            where: { team_id: team.id, status: 'active' },
            select: { user_id: true },
          });
          if (members.length === 0) {
            logger.warn(
              `No active members in team ${team.id} for payment deadline notification`,
            );
            continue;
          }

          const endDay = team.finance_payment_end_day;
          const notification = {
            team_id: team.id,
            type: 'finance_payment_deadline',
            title: 'Thời hạn thanh toán quỹ',
            message: `Vui lòng thanh toán quỹ tháng này trong khoảng ngày ${currentDay}-${endDay}.`,
            data: {
              payment_start_day: team.finance_payment_start_day,
              payment_end_day: team.finance_payment_end_day,
              current_month: currentMonth,
            },
          };

          await this.notification.broadcastNotification(notification);

          await this.prisma.teams.update({
            where: { id: team.id },
            data: { finance_payment_notified_month: currentMonth },
          });

          logger.info(
            `Payment deadline notification sent to team ${team.id} for ${currentMonth}`,
          );
        } catch (error: any) {
          logger.error(
            `Error processing team ${team.id} for payment deadline notification:`,
            error,
          );
        }
      }
    } catch (error: any) {
      logger.error('Error in checkAndNotifyPaymentDeadline:', error);
      throw error;
    }
  }

  async getActivePaymentDeadline(teamId: number | string | bigint): Promise<any> {
    try {
      const today = new Date();
      const currentDay = today.getDate();

      const team = await this.prisma.teams.findUnique({
        where: { id: bi(teamId) },
        select: {
          finance_payment_start_day: true,
          finance_payment_end_day: true,
        },
      });

      if (
        !team ||
        !team.finance_payment_start_day ||
        !team.finance_payment_end_day
      ) {
        return null;
      }

      const isActive = FinanceClosingService.isDayInRange(
        currentDay,
        team.finance_payment_start_day,
        team.finance_payment_end_day,
      );

      if (isActive) {
        return {
          start_day: team.finance_payment_start_day,
          end_day: team.finance_payment_end_day,
          is_active: true,
          days_remaining: FinanceClosingService.calculateDaysRemaining(
            team.finance_payment_end_day,
            team.finance_payment_start_day,
          ),
        };
      }
      return null;
    } catch (error: any) {
      logger.error('Error in getActivePaymentDeadline:', error);
      throw error;
    }
  }
}
