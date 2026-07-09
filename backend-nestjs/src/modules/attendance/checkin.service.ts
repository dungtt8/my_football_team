import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

const POINTS_YES = 10;

/**
 * Port of backend/src/services/checkinService.js.
 */
@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  async createCheckinsForSession(
    sessionId: number | string | bigint,
    teamId: number | string | bigint,
  ): Promise<any[]> {
    const members = await this.prisma.team_members.findMany({
      where: { team_id: bi(teamId), status: 'active' },
      select: { user_id: true },
    });
    if (members.length === 0) return [];

    const now = new Date();
    const rows = members.map((m: any) => ({
      session_id: bi(sessionId),
      user_id: m.user_id,
      team_id: bi(teamId),
      response: null,
      responded_at: null,
      created_at: now,
      updated_at: now,
    }));
    await this.prisma.attendance_checkins.createMany({ data: rows });

    logger.info('Created checkins for session', {
      session_id: sessionId,
      team_id: teamId,
      count: rows.length,
    });
    return rows;
  }

  async getCheckinForUser(
    sessionId: number | string | bigint,
    userId: number | string | bigint,
  ): Promise<any> {
    return this.prisma.attendance_checkins.findFirst({
      where: { session_id: bi(sessionId), user_id: bi(userId) },
    });
  }

  async getActiveCheckinForUser(
    teamId: number | string | bigint,
    userId: number | string | bigint,
  ): Promise<any> {
    const rows = await this.prisma.raw<any[]>(
      `SELECT ac.id, ac.session_id, ac.user_id, ac.response, ac.responded_at,
              s.session_date, s.check_in_deadline, s.location, s.session_type,
              s.description, s.status AS session_status
       FROM attendance_checkins ac
       JOIN attendance_sessions s ON s.id = ac.session_id
       WHERE ac.user_id = $1 AND ac.team_id = $2
         AND s.status = 'active' AND s.team_id = $2
       ORDER BY s.session_date DESC
       LIMIT 1`,
      bi(userId),
      bi(teamId),
    );
    return rows[0] || null;
  }

  async respondToCheckin(
    checkinId: number | string | bigint,
    userId: number | string | bigint,
    response: string,
  ): Promise<any> {
    if (!['yes', 'no'].includes(response)) {
      throw new Error('Response must be "yes" or "no"');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const checkin = await tx.attendance_checkins.findFirst({
        where: { id: bi(checkinId), user_id: bi(userId) },
      });
      if (!checkin) throw new Error('Checkin not found');

      // Lock the parent session row so a concurrent close can't race us.
      const sessions = await tx.$queryRawUnsafe(
        `SELECT * FROM attendance_sessions WHERE id = $1 AND status = 'active' FOR UPDATE`,
        checkin.session_id,
      );
      const session = sessions[0];
      if (!session) throw new Error('Session already closed');

      if (
        session.check_in_deadline &&
        new Date() > new Date(session.check_in_deadline)
      ) {
        throw new Error('Response deadline has passed');
      }

      const now = new Date();
      await tx.attendance_checkins.update({
        where: { id: bi(checkinId) },
        data: { response, responded_at: now, updated_at: now },
      });
      return tx.attendance_checkins.findUnique({ where: { id: bi(checkinId) } });
    });
  }

  async getSessionCheckins(
    sessionId: number | string | bigint,
    teamId: number | string | bigint,
  ): Promise<any[]> {
    return this.prisma.raw<any[]>(
      `SELECT ac.id, ac.user_id, ac.response, ac.responded_at,
              u.full_name, u.email
       FROM attendance_checkins ac
       JOIN users u ON u.id = ac.user_id
       WHERE ac.session_id = $1 AND ac.team_id = $2
       ORDER BY u.full_name`,
      bi(sessionId),
      bi(teamId),
    );
  }

  async awardPointsForSession(
    sessionId: number | string | bigint,
    teamId: number | string | bigint,
  ): Promise<void> {
    const existing = await this.prisma.user_points.findFirst({
      where: { session_id: bi(sessionId), team_id: bi(teamId) },
    });
    if (existing) {
      logger.info('Points already awarded for session', {
        session_id: sessionId,
      });
      return;
    }

    const yesCheckins = await this.prisma.attendance_checkins.findMany({
      where: { session_id: bi(sessionId), team_id: bi(teamId), response: 'yes' },
      select: { user_id: true },
    });
    if (yesCheckins.length === 0) return;

    const month = new Date().toISOString().slice(0, 7);
    const now = new Date();
    const pointRows = yesCheckins.map((c: any) => ({
      user_id: c.user_id,
      team_id: bi(teamId),
      points: POINTS_YES,
      reason: 'attendance_yes',
      month,
      session_id: bi(sessionId),
      created_at: now,
    }));
    await this.prisma.user_points.createMany({ data: pointRows });

    logger.info('Points awarded for session', {
      session_id: sessionId,
      team_id: teamId,
      count: pointRows.length,
      points_each: POINTS_YES,
    });
  }

  async getSessionStats(
    sessionId: number | string | bigint,
    teamId: number | string | bigint,
  ): Promise<any> {
    const session = await this.prisma.attendance_sessions.findFirst({
      where: { id: bi(sessionId), team_id: bi(teamId) },
    });
    if (!session) return null;

    const checkins = await this.prisma.attendance_checkins.findMany({
      where: { session_id: bi(sessionId), team_id: bi(teamId) },
      select: { response: true },
    });

    const yes = checkins.filter((c: any) => c.response === 'yes').length;
    const no = checkins.filter((c: any) => c.response === 'no').length;
    const pending = checkins.filter((c: any) => !c.response).length;
    return { total: checkins.length, yes, no, pending };
  }

  async checkAndCreateCheckInNotifications(): Promise<{
    sessions_checked: number;
    notifications_sent: number;
  }> {
    const currentHour = new Date().getUTCHours();

    const teams = await this.prisma.teams.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, checkin_creation_time: true },
    });

    let sessionsChecked = 0;
    let notificationsSent = 0;

    for (const team of teams) {
      const [configHour] = (team.checkin_creation_time || '13:00')
        .split(':')
        .map(Number);
      if (configHour !== currentHour) continue;

      const activeSessions = await this.prisma.attendance_sessions.findMany({
        where: {
          team_id: team.id,
          status: 'active',
          OR: [
            { check_in_deadline: null },
            { check_in_deadline: { gt: new Date() } },
          ],
        },
      });

      for (const session of activeSessions) {
        sessionsChecked++;
        const pending = await this.prisma.attendance_checkins.findMany({
          where: { session_id: session.id, response: null },
          select: { user_id: true },
        });
        for (const checkin of pending) {
          try {
            await this.notification.sendInternalNotification(
              checkin.user_id,
              `Nhắc điểm danh: vui lòng phản hồi buổi ${
                session.session_type === 'match' ? 'thi đấu' : 'tập'
              } ngày ${new Date(session.session_date).toLocaleDateString('vi-VN')}`,
              { session_id: session.id },
              team.id,
            );
            notificationsSent++;
          } catch (error: any) {
            logger.warn('Failed to send checkin reminder', {
              session_id: session.id,
              user_id: checkin.user_id,
              error: error.message,
            });
          }
        }
      }
    }

    logger.info('Checkin notification sweep complete', {
      sessionsChecked,
      notificationsSent,
    });
    return {
      sessions_checked: sessionsChecked,
      notifications_sent: notificationsSent,
    };
  }
}
