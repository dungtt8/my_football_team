import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from './gamification.service';
import { NotificationService } from '../notification/notification.service';
import { CheckinService } from './checkin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentTeam } from '../../common/decorators/current-user.decorator';
import {
  NotFoundError,
  ValidationError,
} from '../../common/errors/business-errors';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/handlers/attendanceHandler.js.
 */
@Controller('api/attendance')
export class AttendanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    private readonly notification: NotificationService,
    private readonly checkin: CheckinService,
  ) {}

  @Post('sessions')
  @Roles('co_manager', 'owner')
  async createSession(
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { session_date, session_type, check_in_deadline, location, description } =
      body;
    const userId = user.id;
    const teamId = team.id;

    if (!session_date) throw new ValidationError('session_date is required');
    if (!session_type || !['training', 'match'].includes(session_type)) {
      throw new ValidationError('session_type must be "training" or "match"');
    }
    const sessionDate = new Date(session_date);
    if (isNaN(sessionDate.getTime())) {
      throw new ValidationError('Invalid session_date format');
    }
    let deadlineDate: Date | null = null;
    if (check_in_deadline) {
      deadlineDate = new Date(check_in_deadline);
      if (isNaN(deadlineDate.getTime())) {
        throw new ValidationError('Invalid check_in_deadline format');
      }
    }

    const duplicate = await this.prisma.attendance_sessions.findFirst({
      where: {
        team_id: bi(teamId),
        session_date: sessionDate,
        status: { not: 'cancelled' },
      },
    });
    if (duplicate) {
      throw new ValidationError(
        'A session already exists at this date and time',
      );
    }

    const session = await this.prisma.attendance_sessions.create({
      data: {
        team_id: bi(teamId),
        created_by: bi(userId),
        session_date: sessionDate,
        check_in_deadline: deadlineDate,
        location: location || null,
        session_type,
        description: description || null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    await this.checkin.createCheckinsForSession(session.id, teamId);

    await this.notification.emitEvent('attendance.session_created', {
      session_id: session.id,
      team_id: teamId,
      session_date: session.session_date,
      session_type: session.session_type,
      created_by: userId,
    });

    logger.info('Attendance session created', {
      session_id: session.id,
      team_id: teamId,
    });
    return session;
  }

  @Get('sessions')
  @Roles('member', 'co_manager', 'owner')
  async listSessions(
    @Query() query: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const teamId = team?.id || user?.team_id;
    if (!teamId) throw new ValidationError('Team context is required');

    const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const status = query.status;

    const where: any = { team_id: bi(teamId) };
    if (status) where.status = status;

    const total = await this.prisma.attendance_sessions.count({ where });
    const sessions = await this.prisma.attendance_sessions.findMany({
      where,
      orderBy: { session_date: 'desc' },
      take: limitNum,
      skip: offset,
    });

    return {
      data: sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('sessions/:id')
  @Roles('member', 'co_manager', 'owner')
  async getSession(@Param('id') id: string, @CurrentTeam() team: any) {
    const teamId = team.id;
    const session = await this.prisma.attendance_sessions.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!session) throw new NotFoundError('Session not found');

    const checkins = await this.checkin.getSessionCheckins(id, teamId);
    const stats = await this.checkin.getSessionStats(id, teamId);

    return {
      session,
      records: checkins,
      stats,
      total_records: checkins.length,
    };
  }

  @Patch('sessions/:id')
  @Roles('co_manager', 'owner')
  async updateSession(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentTeam() team: any,
  ) {
    const teamId = team.id;
    const { session_date, session_type, check_in_deadline, location, description } =
      body;

    const session = await this.prisma.attendance_sessions.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!session) throw new NotFoundError('Session not found');
    if (session.status !== 'active') {
      throw new ValidationError('Cannot edit a closed session');
    }

    const data: any = { updated_at: new Date() };

    if (session_date !== undefined) {
      const d = new Date(session_date);
      if (isNaN(d.getTime())) throw new ValidationError('Invalid session_date format');
      data.session_date = d;
    }
    if (check_in_deadline !== undefined) {
      if (check_in_deadline === null) {
        data.check_in_deadline = null;
      } else {
        const d = new Date(check_in_deadline);
        if (isNaN(d.getTime())) {
          throw new ValidationError('Invalid check_in_deadline format');
        }
        data.check_in_deadline = d;
      }
    }
    if (session_type !== undefined) {
      if (!['training', 'match'].includes(session_type)) {
        throw new ValidationError('session_type must be "training" or "match"');
      }
      data.session_type = session_type;
    }
    if (location !== undefined) data.location = location || null;
    if (description !== undefined) data.description = description || null;

    const updated = await this.prisma.attendance_sessions.update({
      where: { id: bi(id) },
      data,
    });

    logger.info('Attendance session updated', { session_id: id, team_id: teamId });
    return updated;
  }

  @Post('sessions/:id/close')
  @Roles('co_manager', 'owner')
  @HttpCode(200)
  async closeSession(@Param('id') id: string, @CurrentTeam() team: any) {
    const teamId = team.id;
    const session = await this.prisma.attendance_sessions.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!session) throw new NotFoundError('Session not found');
    if (session.status !== 'active') {
      throw new ValidationError('Session is already closed');
    }

    const closedAt = new Date();
    await this.prisma.attendance_sessions.update({
      where: { id: bi(id) },
      data: { status: 'closed', closed_at: closedAt, updated_at: closedAt },
    });

    await this.checkin.awardPointsForSession(id, teamId);

    await this.notification.emitEvent('attendance.session_closed', {
      session_id: id,
      team_id: teamId,
      closed_at: closedAt,
    });

    logger.info('Session closed', { session_id: id, team_id: teamId });
    return { id, status: 'closed', closed_at: closedAt };
  }

  @Get('leaderboard')
  @Roles('member', 'co_manager', 'owner')
  async getLeaderboard(@CurrentUser() user: any, @CurrentTeam() team: any) {
    const teamId = team?.id || user?.team_id;
    if (!teamId) throw new ValidationError('Team context is required');
    const currentMonth = this.gamification.getCurrentMonth();
    const leaderboard = await this.gamification.getLeaderboard(
      teamId,
      currentMonth,
    );
    return { month: currentMonth, leaderboard };
  }

  @Get('leaderboard/:month')
  @Roles('member', 'co_manager', 'owner')
  async getHistoricalLeaderboard(
    @Param('month') month: string,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const teamId = team?.id || user?.team_id;
    if (!teamId) throw new ValidationError('Team context is required');
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new ValidationError('Month must be YYYY-MM');
    }
    const leaderboard = await this.gamification.getLeaderboard(teamId, month);
    return { month, leaderboard };
  }

  @Get('stats/:userId')
  @Roles('member', 'co_manager', 'owner')
  async getUserStats(
    @Param('userId') userId: string,
    @Query('month') month: string,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const teamId = team?.id || user?.team_id;
    if (!teamId) throw new ValidationError('Team context is required');
    const targetMonth = month || this.gamification.getCurrentMonth();
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new ValidationError('Month must be YYYY-MM');
    }
    return this.gamification.getUserStats(userId, teamId, targetMonth);
  }

  @Get('history')
  @Roles('member', 'co_manager', 'owner')
  async getAttendanceHistory(
    @Query('month') month: string,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const userId = user?.id;
    const teamId = team?.id || user?.team_id;
    if (!userId) throw new ValidationError('User not authenticated');
    if (!teamId) throw new ValidationError('Team not found');
    const targetMonth = month || this.gamification.getCurrentMonth();
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new ValidationError('Month must be YYYY-MM');
    }

    const history = await this.prisma.raw<any[]>(
      `SELECT ac.id, ac.session_id, ac.response, ac.responded_at,
              s.session_date, s.location, s.session_type
       FROM attendance_checkins ac
       JOIN attendance_sessions s ON s.id = ac.session_id
       WHERE ac.user_id = $1 AND ac.team_id = $2
         AND TO_CHAR(s.session_date, 'YYYY-MM') = $3
       ORDER BY s.session_date DESC`,
      bi(userId),
      bi(teamId),
      targetMonth,
    );

    return { user_id: userId, month: targetMonth, history };
  }
}
