import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CheckinService } from './checkin.service';
import {
  NotFoundError,
  ValidationError,
} from '../../common/errors/business-errors';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

export const DAYS_OF_WEEK = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

/** Smallest non-negative days from fromIdx to toIdx (0=sun..6=sat). */
export function daysUntil(fromIdx: number, toIdx: number): number {
  return (toIdx - fromIdx + 7) % 7;
}

function isTimeWindowActive(configuredUtcTime?: string): boolean {
  if (!configuredUtcTime) return true;
  try {
    const [configHour] = configuredUtcTime.split(':').map(Number);
    const currentHour = new Date().getUTCHours();
    return currentHour === configHour;
  } catch {
    logger.warn('Invalid checkin_creation_time format:', configuredUtcTime);
    return true;
  }
}

function gmt7DateAt(daysFromToday: number, hours: number, minutes: number): Date {
  const now = new Date();
  const gmt7Target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysFromToday,
      hours,
      minutes,
      0,
      0,
    ),
  );
  return new Date(gmt7Target.getTime() - 7 * 60 * 60 * 1000);
}

function utcDateAt(daysFromToday: number, hours: number, minutes: number): Date {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday),
  );
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Port of backend/src/services/sessionSchedulingService.js.
 */
@Injectable()
export class SessionSchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
    private readonly checkin: CheckinService,
  ) {}

  shouldCreateSession(team: any): boolean {
    if (!team.auto_create_sessions || team.session_frequency === 'disabled') {
      return false;
    }
    if (!isTimeWindowActive(team.checkin_creation_time || '13:00')) {
      return false;
    }
    if (team.last_auto_session_created_at) {
      const lastCreated = new Date(team.last_auto_session_created_at);
      const today = new Date();
      const lastCreatedDate = new Date(
        lastCreated.getFullYear(),
        lastCreated.getMonth(),
        lastCreated.getDate(),
      );
      const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      if (lastCreatedDate.getTime() === todayDate.getTime()) return false;
    }

    if (team.session_frequency === 'daily') return true;
    if (team.session_frequency === 'weekly') {
      const todayName = DAYS_OF_WEEK[new Date().getUTCDay()];
      return (team.checkin_creation_day || 'mon').toLowerCase() === todayName;
    }
    return false;
  }

  async createAutoSession(teamId: number | string | bigint): Promise<any> {
    try {
      const team = await this.prisma.teams.findUnique({
        where: { id: bi(teamId) },
      });
      if (!team) throw new NotFoundError(`Team ${teamId} not found`);
      if (!this.shouldCreateSession(team)) return null;

      const todayIdx = new Date().getUTCDay();
      const [sessHours, sessMinutes] = (team.session_time || '18:00')
        .split(':')
        .map(Number);

      let eventDayOffset = 0;
      if (team.session_frequency === 'weekly') {
        const eventDayIdxs = (team.session_days || '')
          .split(',')
          .map((d: string) => d.trim().toLowerCase())
          .filter(Boolean)
          .map((d: string) => DAYS_OF_WEEK.indexOf(d))
          .filter((idx: number) => idx >= 0);
        if (eventDayIdxs.length > 0) {
          eventDayOffset = Math.min(
            ...eventDayIdxs.map((idx: number) => daysUntil(todayIdx, idx)),
          );
        }
      }
      const sessionDate = gmt7DateAt(eventDayOffset, sessHours, sessMinutes);

      const [dlHour, dlMin] = (
        team.checkin_deadline_time ||
        team.checkin_creation_time ||
        '13:00'
      )
        .split(':')
        .map(Number);
      const endDayIdx = DAYS_OF_WEEK.indexOf(
        (team.checkin_end_day || 'tue').toLowerCase(),
      );
      const deadlineOffset = endDayIdx >= 0 ? daysUntil(todayIdx, endDayIdx) : 0;
      let checkInDeadline = utcDateAt(deadlineOffset, dlHour, dlMin);
      if (checkInDeadline > sessionDate) checkInDeadline = sessionDate;

      const session = await this.prisma.attendance_sessions.create({
        data: {
          team_id: bi(teamId),
          session_date: sessionDate,
          session_type:
            team.session_type === 'both' ? 'training' : team.session_type,
          location: team.session_location || null,
          check_in_deadline: checkInDeadline,
          status: 'active',
          created_by: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await this.checkin.createCheckinsForSession(session.id, teamId);

      await this.prisma.teams.update({
        where: { id: bi(teamId) },
        data: { last_auto_session_created_at: new Date() },
      });

      logger.info('Auto-created attendance session', {
        team_id: teamId,
        session_id: session.id,
        session_type: session.session_type,
      });

      try {
        await this.notification.emitEvent('attendance.session_created', {
          session_id: session.id,
          team_id: teamId,
          session_date: session.session_date,
          session_type: session.session_type,
          created_by: null,
        });
      } catch (notifError: any) {
        logger.warn('Failed to emit event for auto-created session', {
          session_id: session.id,
          error: notifError.message,
        });
      }

      return session;
    } catch (error: any) {
      logger.error('Error auto-creating session', {
        team_id: teamId,
        error: error.message,
      });
      throw error;
    }
  }

  async processAutoSessions(): Promise<{ created: number; skipped: number }> {
    try {
      logger.info('Starting auto-session processing');
      const teams = await this.prisma.teams.findMany({
        where: {
          auto_create_sessions: true,
          session_frequency: { not: 'disabled' },
          deleted_at: null,
        },
      });
      logger.info(`Found ${teams.length} teams with auto-session enabled`);

      let createdCount = 0;
      let skippedCount = 0;
      for (const team of teams) {
        try {
          if (this.shouldCreateSession(team)) {
            await this.createAutoSession(team.id);
            createdCount++;
          } else {
            skippedCount++;
          }
        } catch (error: any) {
          logger.error(`Error processing team ${team.id}:`, error.message);
        }
      }
      logger.info('Auto-session processing complete', {
        created: createdCount,
        skipped: skippedCount,
      });
      return { created: createdCount, skipped: skippedCount };
    } catch (error: any) {
      logger.error('Error in processAutoSessions', error);
      throw error;
    }
  }

  async updateSessionSchedule(
    teamId: number | string | bigint,
    settings: any,
  ): Promise<any> {
    const updates: any = {};

    if (Object.prototype.hasOwnProperty.call(settings, 'auto_create_sessions')) {
      updates.auto_create_sessions = Boolean(settings.auto_create_sessions);
    }
    if (settings.frequency) {
      if (!['disabled', 'daily', 'weekly', 'custom'].includes(settings.frequency)) {
        throw new ValidationError('Invalid session frequency');
      }
      updates.session_frequency = settings.frequency;
    }
    if (settings.session_days !== undefined && settings.frequency === 'weekly') {
      const days = settings.session_days
        .split(',')
        .map((d: string) => d.trim().toLowerCase());
      const validDays = days.every((d: string) => DAYS_OF_WEEK.includes(d));
      if (!validDays) {
        throw new ValidationError(
          'Invalid day names. Use: sun, mon, tue, wed, thu, fri, sat',
        );
      }
      updates.session_days = settings.session_days;
    }
    if (settings.session_time) {
      const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(settings.session_time)) {
        throw new ValidationError('Invalid session time format. Use HH:mm');
      }
      updates.session_time = settings.session_time;
    }
    if (settings.session_type) {
      if (!['training', 'match', 'both'].includes(settings.session_type)) {
        throw new ValidationError('Invalid session type');
      }
      updates.session_type = settings.session_type;
    }
    if (settings.session_location !== undefined) {
      updates.session_location = settings.session_location || null;
    }

    if (Object.keys(updates).length === 0) return null;

    await this.prisma.teams.update({
      where: { id: bi(teamId) },
      data: updates,
    });
    logger.info('Session schedule updated', {
      team_id: teamId,
      updates: Object.keys(updates),
    });
    return updates;
  }
}
