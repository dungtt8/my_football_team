import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamService } from './team.service';
import { AuthService } from '../auth/auth.service';
import { StorageService } from '../storage/storage.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTenancy } from '../../common/decorators/skip-tenancy.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/business-errors';
import { imageMulterOptions } from '../../common/upload/multer-options';
import { utcToGmt7, gmt7ToUtc } from '../../common/utils/timezone';
import {
  DAYS_OF_WEEK,
  daysUntil,
} from '../attendance/session-scheduling.service';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

const VALID_ROLES = ['member', 'co_manager', 'owner'];

/**
 * Port of backend/src/handlers/teamHandler.js.
 * Routes tagged @SkipTenancy() correspond to the Express routes mounted after
 * authMiddleware but BEFORE tenancyMiddleware (auth-only, no team context).
 */
@Controller('api')
export class TeamController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly team: TeamService,
    private readonly auth: AuthService,
    private readonly storage: StorageService,
  ) {}

  // ── Auth-only routes (no tenancy) ──────────────────────────────────────────

  @Put('profile')
  @SkipTenancy()
  @HttpCode(200)
  async updateProfile(@Body() body: any, @CurrentUser() user: any) {
    const userId = user.user_id;
    const { full_name, phone } = body;

    if (full_name !== undefined && (!full_name || !full_name.trim())) {
      throw new ValidationError('Full name cannot be empty');
    }
    if (phone !== undefined && phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      throw new ValidationError('Invalid phone format');
    }

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (phone !== undefined) updateData.phone = phone || null;

    const updated = await this.prisma.users.update({
      where: { id: bi(userId) },
      data: { ...updateData, updated_at: new Date() },
    });
    logger.info('Profile updated', { user_id: userId });
    return {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      phone: updated.phone,
    };
  }

  @Put('auth/password')
  @SkipTenancy()
  @HttpCode(200)
  async changePassword(@Body() body: any, @CurrentUser() user: any) {
    const userId = user.user_id;
    const { current_password, new_password, new_password_confirm } = body;

    if (!current_password) throw new ValidationError('Current password is required');
    if (!new_password) throw new ValidationError('New password is required');
    if (!new_password_confirm)
      throw new ValidationError('Password confirmation is required');
    if (new_password !== new_password_confirm) {
      throw new ValidationError('New passwords do not match');
    }
    if (new_password.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }
    if (new_password === current_password) {
      throw new ValidationError(
        'New password must be different from current password',
      );
    }

    const dbUser = await this.prisma.users.findUnique({
      where: { id: bi(userId) },
    });
    if (!dbUser) throw new NotFoundError('User not found');

    const ok = await this.team.verifyPassword(
      current_password,
      dbUser.password_hash || '',
    );
    if (!ok) throw new ValidationError('Current password is incorrect');

    const hashed = await this.team.hashPassword(new_password);
    await this.prisma.users.update({
      where: { id: bi(userId) },
      data: { password_hash: hashed, updated_at: new Date() },
    });
    logger.info('Password changed', { user_id: userId });
    return { message: 'Password changed successfully' };
  }

  @Post('teams')
  @SkipTenancy()
  async createTeam(@Body() body: any, @CurrentUser() user: any) {
    const userId = user.user_id;
    const { name, description } = body;
    if (!name || !name.trim()) throw new ValidationError('Team name is required');

    let invite_code = '';
    let attempts = 0;
    while (attempts < 10) {
      invite_code = this.team.generateInviteCode();
      const exists = await this.prisma.teams.findFirst({ where: { invite_code } });
      if (!exists) break;
      attempts++;
    }

    let team: any;
    try {
      team = await this.prisma.teams.create({
        data: {
          name: name.trim(),
          description: description || null,
          owner_id: bi(userId),
          invite_code,
          created_at: new Date(),
        },
      });
    } catch (insertError: any) {
      logger.error('Failed to create team due to invite code collision', {
        owner_id: userId,
        error: insertError.message,
      });
      throw new ConflictError(
        'Could not generate a unique invite code, please try again',
      );
    }

    await this.prisma.team_members.create({
      data: {
        team_id: team.id,
        user_id: bi(userId),
        role: 'owner',
        status: 'active',
        created_at: new Date(),
      },
    });

    const allTeams = await this.team.getUserTeams(userId);
    const token = this.auth.generateJWT(
      {
        id: userId,
        team_id: team.id,
        email: user.email,
        role: 'owner',
        zalo_user_id: user.zalo_user_id,
      },
      allTeams,
    );

    logger.info('Team created', {
      team_id: team.id,
      owner_id: userId,
      name: team.name,
    });

    return {
      token,
      team: { id: team.id, name: team.name, invite_code: team.invite_code },
      role: 'owner',
      teams: allTeams,
    };
  }

  @Post('teams/join')
  @SkipTenancy()
  @HttpCode(200)
  async joinTeam(@Body() body: any, @CurrentUser() user: any) {
    const userId = user.user_id;
    const { invite_code } = body;
    if (!invite_code || !invite_code.trim()) {
      throw new ValidationError('Invite code is required');
    }

    const team = await this.prisma.teams.findFirst({
      where: {
        invite_code: invite_code.trim().toUpperCase(),
        deleted_at: null,
      },
    });
    if (!team) throw new NotFoundError('Invalid invite code');

    const existing = await this.prisma.team_members.findFirst({
      where: { team_id: team.id, user_id: bi(userId) },
    });
    if (existing) {
      if (existing.status === 'active') {
        const allTeams = await this.team.getUserTeams(userId);
        const token = this.auth.generateJWT(
          {
            id: userId,
            team_id: team.id,
            email: user.email,
            role: existing.role,
            zalo_user_id: user.zalo_user_id,
          },
          allTeams,
        );
        return {
          token,
          team: { id: team.id, name: team.name },
          role: existing.role,
          teams: allTeams,
        };
      }
      await this.prisma.team_members.update({
        where: { id: existing.id },
        data: { status: 'active', deactivated_at: null },
      });
    } else {
      await this.prisma.team_members.create({
        data: {
          team_id: team.id,
          user_id: bi(userId),
          role: 'member',
          status: 'active',
          created_at: new Date(),
        },
      });
    }

    const role = existing?.role || 'member';
    const allTeams = await this.team.getUserTeams(userId);
    const token = this.auth.generateJWT(
      {
        id: userId,
        team_id: team.id,
        email: user.email,
        role,
        zalo_user_id: user.zalo_user_id,
      },
      allTeams,
    );
    logger.info('User joined team', { team_id: team.id, user_id: userId });
    return {
      token,
      team: { id: team.id, name: team.name },
      role,
      teams: allTeams,
    };
  }

  @Get('user/teams')
  @SkipTenancy()
  async listUserTeams(@CurrentUser() user: any) {
    const userId = user.user_id;
    const currentTeamId = user.team_id;
    const teams = await this.team.getUserTeams(userId);
    if (teams.length === 0) {
      return {
        teams: [],
        currentTeamId: null,
        message: 'No teams found. Create or join a team to get started.',
      };
    }
    logger.info('User teams listed', { user_id: userId, count: teams.length });
    return { teams, currentTeamId, total: teams.length };
  }

  @Post('teams/:teamId/switch')
  @SkipTenancy()
  @HttpCode(200)
  async switchTeam(
    @Param('teamId') teamIdParam: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.user_id;
    const targetTeamId = parseInt(teamIdParam, 10);

    const membership = await this.prisma.team_members.findFirst({
      where: {
        team_id: bi(targetTeamId),
        user_id: bi(userId),
        status: 'active',
        deleted_at: null,
      },
    });
    if (!membership) {
      throw new NotFoundError(
        'You are not a member of this team or membership is inactive',
      );
    }

    const team = await this.prisma.teams.findFirst({
      where: { id: bi(targetTeamId), deleted_at: null },
    });
    if (!team) throw new NotFoundError('Team not found');

    const allTeams = await this.team.getUserTeams(userId);
    const token = this.auth.generateJWT(
      {
        id: userId,
        team_id: targetTeamId,
        email: user.email,
        role: membership.role,
        zalo_user_id: user.zalo_user_id,
      },
      allTeams,
    );
    logger.info('Team switched', {
      user_id: userId,
      from_team: user.team_id,
      to_team: targetTeamId,
      role: membership.role,
    });
    return {
      token,
      team: { id: team.id, name: team.name },
      role: membership.role,
      teams: allTeams,
    };
  }

  // ── Tenancy-scoped routes ──────────────────────────────────────────────────

  @Get('team/members')
  @Roles('member', 'co_manager', 'owner')
  async listMembers(@CurrentUser() user: any) {
    const teamId = user.team_id;
    const members = await this.prisma.raw<any[]>(
      `SELECT u.id, u.full_name, u.email, u.phone, tm.role, tm.status,
              tm.created_at, u.last_login_at
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND tm.status = 'active'
         AND tm.deleted_at IS NULL AND u.deleted_at IS NULL
       ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'co_manager' THEN 1 ELSE 2 END,
                u.full_name`,
      bi(teamId),
    );
    return { data: members, total: members.length };
  }

  @Patch('team/members/:userId/role')
  @Roles('owner')
  @HttpCode(200)
  async updateMemberRole(
    @Param('userId') userIdParam: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const teamId = user.team_id;
    const actorRole = user.role;
    const targetUserId = parseInt(userIdParam, 10);
    const newRole = body.role;

    if (actorRole !== 'owner') {
      throw new HttpException(
        { error: 'Only the team owner can change member roles' },
        403,
      );
    }
    if (!VALID_ROLES.includes(newRole)) {
      throw new ValidationError(
        `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      );
    }
    if (targetUserId === user.user_id) {
      throw new ValidationError('Cannot change your own role');
    }

    const membership = await this.prisma.team_members.findFirst({
      where: {
        team_id: bi(teamId),
        user_id: bi(targetUserId),
        status: 'active',
      },
    });
    if (!membership) throw new NotFoundError('Member not found in this team');

    await this.prisma.team_members.updateMany({
      where: { team_id: bi(teamId), user_id: bi(targetUserId) },
      data: { role: newRole },
    });
    logger.info('Member role updated', {
      team_id: teamId,
      target_user_id: targetUserId,
      old_role: membership.role,
      new_role: newRole,
      by: user.user_id,
    });

    const updatedUser = await this.prisma.users.findUnique({
      where: { id: bi(targetUserId) },
    });
    return {
      message: 'Role updated successfully',
      user: {
        id: updatedUser.id,
        full_name: updatedUser.full_name,
        role: newRole,
      },
    };
  }

  @Get('team/invite')
  @Roles('owner', 'co_manager')
  async getInviteCode(@CurrentUser() user: any) {
    const teamId = user.team_id;
    const team = await this.prisma.teams.findUnique({ where: { id: bi(teamId) } });
    if (!team) throw new NotFoundError('Team not found');
    return { invite_code: team.invite_code, team_name: team.name };
  }

  @Post('team/invite/regenerate')
  @Roles('owner')
  @HttpCode(200)
  async regenerateInviteCode(@CurrentUser() user: any) {
    const teamId = user.team_id;
    let invite_code = '';
    let attempts = 0;
    while (attempts < 10) {
      invite_code = this.team.generateInviteCode();
      const exists = await this.prisma.teams.findFirst({ where: { invite_code } });
      if (!exists) break;
      attempts++;
    }
    try {
      await this.prisma.teams.update({
        where: { id: bi(teamId) },
        data: { invite_code },
      });
    } catch (updateError: any) {
      logger.error('Failed to regenerate invite code due to collision', {
        team_id: teamId,
        error: updateError.message,
      });
      throw new ConflictError(
        'Could not generate a unique invite code, please try again',
      );
    }
    logger.info('Invite code regenerated', { team_id: teamId });
    return { invite_code };
  }

  @Get('team/settings')
  @Roles('member', 'co_manager', 'owner')
  async getSettings(@CurrentUser() user: any) {
    const teamId = user.team_id;
    const team = await this.prisma.teams.findUnique({ where: { id: bi(teamId) } });
    if (!team) throw new NotFoundError('Team not found');
    return this.serializeSettings(team);
  }

  @Put('team/settings')
  @Roles('owner')
  @HttpCode(200)
  async updateSettings(@Body() reqBody: any, @CurrentUser() user: any) {
    const teamId = user.team_id;
    const { general, attendance, finance } = reqBody;

    if (user.role !== 'owner') {
      throw new HttpException(
        { error: 'Only team owner can update settings' },
        403,
      );
    }

    const currentTeam = await this.prisma.teams.findUnique({
      where: { id: bi(teamId) },
    });
    if (!currentTeam) throw new NotFoundError('Team not found');

    const updates: any = {};
    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;

    if (general) {
      if (general.name && general.name.trim()) updates.name = general.name.trim();
      if (Object.prototype.hasOwnProperty.call(general, 'description')) {
        updates.description = general.description || null;
      }
    }

    if (attendance) {
      if (Object.prototype.hasOwnProperty.call(attendance, 'enabled')) {
        updates.attendance_enabled = Boolean(attendance.enabled);
      }
      if (attendance.cooldown_minutes !== undefined) {
        const cooldown = parseInt(attendance.cooldown_minutes, 10);
        if (isNaN(cooldown) || cooldown < 1 || cooldown > 60) {
          throw new ValidationError(
            'Attendance cooldown must be between 1 and 60 minutes',
          );
        }
        updates.attendance_cooldown_minutes = cooldown;
      }
    }

    if (finance) {
      if (finance.closing_day !== undefined) {
        const day = parseInt(finance.closing_day, 10);
        if (isNaN(day) || day < 1 || day > 31) {
          throw new ValidationError('Finance closing day must be between 1 and 31');
        }
        updates.finance_closing_day = day;
      }
      if (finance.closing_time) {
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
          const effectiveStartDay =
            finance.payment_start_day !== undefined
              ? finance.payment_start_day
              : currentTeam.finance_payment_start_day;
          if (effectiveStartDay && day < effectiveStartDay) {
            throw new ValidationError(
              'Payment end day must be after or equal to start day',
            );
          }
          updates.finance_payment_end_day = day;
        }
      }
      if (
        finance.payment_start_day !== undefined ||
        finance.payment_end_day !== undefined
      ) {
        updates.finance_payment_notified_month = null;
      }
    }

    if (reqBody.scheduling) {
      const scheduling = reqBody.scheduling;
      const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      if (Object.prototype.hasOwnProperty.call(scheduling, 'auto_create_sessions')) {
        updates.auto_create_sessions = Boolean(scheduling.auto_create_sessions);
      }
      if (scheduling.session_frequency !== undefined) {
        if (
          !['disabled', 'daily', 'weekly', 'custom'].includes(
            scheduling.session_frequency,
          )
        ) {
          throw new ValidationError(
            'Session frequency must be one of: disabled, daily, weekly, custom',
          );
        }
        updates.session_frequency = scheduling.session_frequency;
      }
      if (scheduling.session_days !== undefined) {
        if (scheduling.session_days && typeof scheduling.session_days === 'string') {
          const days = scheduling.session_days
            .split(',')
            .map((d: string) => d.trim().toLowerCase());
          const invalidDays = days.filter((d: string) => !validDays.includes(d));
          if (invalidDays.length > 0) {
            throw new ValidationError(
              `Invalid days: ${invalidDays.join(', ')}. Valid days are: mon, tue, wed, thu, fri, sat, sun`,
            );
          }
        }
        updates.session_days = scheduling.session_days || null;
      }
      if (scheduling.session_time !== undefined) {
        if (scheduling.session_time && !timeRegex.test(scheduling.session_time)) {
          throw new ValidationError('Session time must be in HH:mm format');
        }
        updates.session_time = scheduling.session_time || '18:00';
      }
      if (scheduling.session_type !== undefined) {
        if (!['training', 'match', 'both'].includes(scheduling.session_type)) {
          throw new ValidationError(
            'Session type must be one of: training, match, both',
          );
        }
        updates.session_type = scheduling.session_type;
      }
      if (scheduling.session_location !== undefined) {
        updates.session_location = scheduling.session_location || null;
      }
      if (scheduling.auto_session_creation_time !== undefined) {
        if (scheduling.auto_session_creation_time) {
          if (!timeRegex.test(scheduling.auto_session_creation_time)) {
            throw new ValidationError(
              'Auto-session creation time must be in HH:mm format (GMT+7)',
            );
          }
          updates.auto_session_creation_time = gmt7ToUtc(
            scheduling.auto_session_creation_time,
          );
        } else {
          updates.auto_session_creation_time = '03:00';
        }
      }
      if (scheduling.checkin_creation_day !== undefined) {
        if (
          scheduling.checkin_creation_day &&
          !validDays.includes(scheduling.checkin_creation_day.toLowerCase())
        ) {
          throw new ValidationError(
            'Invalid check-in creation day. Must be: mon, tue, wed, thu, fri, sat, sun',
          );
        }
        updates.checkin_creation_day = scheduling.checkin_creation_day || 'mon';
      }
      if (scheduling.checkin_creation_time !== undefined) {
        if (scheduling.checkin_creation_time) {
          if (!timeRegex.test(scheduling.checkin_creation_time)) {
            throw new ValidationError(
              'Check-in creation time must be in HH:mm format (GMT+7)',
            );
          }
          updates.checkin_creation_time = gmt7ToUtc(
            scheduling.checkin_creation_time,
          );
        } else {
          updates.checkin_creation_time = '13:00';
        }
      }
      if (scheduling.checkin_start_day !== undefined) {
        if (
          scheduling.checkin_start_day &&
          !validDays.includes(scheduling.checkin_start_day.toLowerCase())
        ) {
          throw new ValidationError(
            'Invalid check-in start day. Must be: mon, tue, wed, thu, fri, sat, sun',
          );
        }
        updates.checkin_start_day = scheduling.checkin_start_day || 'fri';
      }
      if (scheduling.checkin_end_day !== undefined) {
        if (
          scheduling.checkin_end_day &&
          !validDays.includes(scheduling.checkin_end_day.toLowerCase())
        ) {
          throw new ValidationError(
            'Invalid check-in end day. Must be: mon, tue, wed, thu, fri, sat, sun',
          );
        }
        updates.checkin_end_day = scheduling.checkin_end_day || 'tue';
      }
      if (scheduling.checkin_deadline_time !== undefined) {
        if (scheduling.checkin_deadline_time) {
          if (!timeRegex.test(scheduling.checkin_deadline_time)) {
            throw new ValidationError(
              'Check-in deadline time must be in HH:mm format (GMT+7)',
            );
          }
          updates.checkin_deadline_time = gmt7ToUtc(
            scheduling.checkin_deadline_time,
          );
        } else {
          updates.checkin_deadline_time = '13:00';
        }
      }

      const effectiveFrequency =
        updates.session_frequency !== undefined
          ? updates.session_frequency
          : currentTeam.session_frequency;
      const effectiveSessionDays =
        updates.session_days !== undefined
          ? updates.session_days
          : currentTeam.session_days;
      const effectiveCreationDay =
        updates.checkin_creation_day !== undefined
          ? updates.checkin_creation_day
          : currentTeam.checkin_creation_day;
      const effectiveEndDay =
        updates.checkin_end_day !== undefined
          ? updates.checkin_end_day
          : currentTeam.checkin_end_day;

      if (
        effectiveFrequency === 'weekly' &&
        effectiveSessionDays &&
        effectiveCreationDay &&
        effectiveEndDay
      ) {
        const eventDayIdxs = effectiveSessionDays
          .split(',')
          .map((d: string) => d.trim().toLowerCase())
          .filter(Boolean)
          .map((d: string) => DAYS_OF_WEEK.indexOf(d))
          .filter((idx: number) => idx >= 0);
        const creationDayIdx = DAYS_OF_WEEK.indexOf(
          effectiveCreationDay.toLowerCase(),
        );
        const endDayIdx = DAYS_OF_WEEK.indexOf(effectiveEndDay.toLowerCase());

        if (eventDayIdxs.length > 0 && creationDayIdx >= 0 && endDayIdx >= 0) {
          const eventOffset = Math.min(
            ...eventDayIdxs.map((idx: number) => daysUntil(creationDayIdx, idx)),
          );
          const deadlineOffset = daysUntil(creationDayIdx, endDayIdx);
          if (deadlineOffset > eventOffset) {
            throw new ValidationError(
              'Ngày hết hạn điểm danh ("Đến ngày") phải trước hoặc trùng với ngày diễn ra sự kiện gần nhất tính từ ngày gửi thông báo. Vui lòng chọn lại "Đến ngày" hoặc "Các ngày diễn ra trong tuần".',
            );
          }
        }
      }
    }

    if (reqBody.fund) {
      const fund = reqBody.fund;
      if (fund.bank_account_number !== undefined) {
        if (fund.bank_account_number && typeof fund.bank_account_number === 'string') {
          const accountNumber = fund.bank_account_number.trim();
          if (accountNumber && accountNumber.length > 50) {
            throw new ValidationError(
              'Bank account number is too long (max 50 characters)',
            );
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
      return { message: 'No changes made' };
    }

    await this.prisma.teams.update({
      where: { id: bi(teamId) },
      data: updates,
    });
    logger.info('Team settings updated', {
      team_id: teamId,
      by: user.user_id,
      changes: Object.keys(updates),
    });

    const updatedTeam = await this.prisma.teams.findUnique({
      where: { id: bi(teamId) },
    });
    return {
      message: 'Settings updated successfully',
      ...this.serializeSettings(updatedTeam, false),
    };
  }

  @Post('team/settings/qr-code/upload')
  @Roles('owner')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('qr_code', imageMulterOptions))
  async uploadQRCode(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const teamId = user.team_id;
    const userId = user.id;
    if (!file) throw new ValidationError('QR code image is required');

    const { url, path } = await this.storage.uploadQRCode(
      file.buffer,
      file.originalname,
      teamId,
    );
    await this.prisma.teams.update({
      where: { id: bi(teamId) },
      data: { fund_qr_code_url: url, updated_at: new Date() },
    });
    logger.info('QR code uploaded', {
      team_id: teamId,
      uploaded_by: userId,
      file_name: file.originalname,
      storage_path: path,
    });
    return { message: 'QR code uploaded successfully', qr_code_url: url };
  }

  @Delete('team/settings/qr-code')
  @Roles('owner')
  @HttpCode(200)
  async deleteQRCode(@CurrentUser() user: any) {
    const teamId = user.team_id;
    const userId = user.id;
    const team = await this.prisma.teams.findUnique({ where: { id: bi(teamId) } });
    if (!team || !team.fund_qr_code_url) {
      throw new NotFoundError('QR code not found');
    }
    await this.prisma.teams.update({
      where: { id: bi(teamId) },
      data: { fund_qr_code_url: null, updated_at: new Date() },
    });
    logger.info('QR code deleted', { team_id: teamId, deleted_by: userId });
    return { message: 'QR code deleted successfully' };
  }

  @Put('team/members/:memberId/deactivate')
  @Roles('owner', 'co_manager')
  @HttpCode(200)
  async deactivateMember(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    const teamId = user.team_id;
    const callerId = user.user_id;
    const callerRole = user.role;

    if (!['owner', 'co_manager'].includes(callerRole)) {
      throw new Error('Only owner and co_manager can manage members');
    }
    const member = await this.prisma.team_members.findFirst({
      where: { id: bi(parseInt(memberId, 10)), team_id: bi(teamId) },
    });
    if (!member) throw new NotFoundError('Team member not found');
    if (Number(member.user_id) === callerId) {
      throw new Error('Cannot deactivate yourself');
    }
    if (member.role === 'owner') throw new Error('Cannot deactivate team owner');

    const updated = await this.prisma.team_members.update({
      where: { id: member.id },
      data: { status: 'inactive', deactivated_at: new Date() },
    });
    logger.info('Member deactivated', {
      team_id: teamId,
      member_id: member.id,
      user_id: member.user_id,
      deactivated_by: callerId,
    });
    return updated;
  }

  @Put('team/members/:memberId/kick')
  @Roles('owner', 'co_manager')
  @HttpCode(200)
  async kickMember(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    const teamId = user.team_id;
    const callerId = user.user_id;
    const callerRole = user.role;

    if (!['owner', 'co_manager'].includes(callerRole)) {
      throw new Error('Only owner and co_manager can manage members');
    }
    const member = await this.prisma.team_members.findFirst({
      where: { id: bi(parseInt(memberId, 10)), team_id: bi(teamId) },
    });
    if (!member) throw new NotFoundError('Team member not found');
    if (Number(member.user_id) === callerId) {
      throw new Error('Cannot kick yourself');
    }
    if (member.role === 'owner') throw new Error('Cannot kick team owner');

    await this.prisma.team_members.update({
      where: { id: member.id },
      data: { status: 'kicked', deleted_at: new Date() },
    });
    logger.info('Member kicked', {
      team_id: teamId,
      member_id: member.id,
      user_id: member.user_id,
      kicked_by: callerId,
    });
    return {
      message: 'Member kicked successfully',
      member_id: member.id,
      team_id: teamId,
      user_id: member.user_id,
      status: 'kicked',
    };
  }

  @Put('members/jersey-number')
  @HttpCode(200)
  async updateJerseyNumber(@Body() body: any, @CurrentUser() user: any) {
    const userId = user.user_id;
    const team_id = user.team_id;
    const { jersey_number } = body;

    if (!team_id) throw new ValidationError('team_id is required');
    if (jersey_number !== null && jersey_number !== undefined) {
      if (!Number.isInteger(jersey_number) || jersey_number <= 0) {
        throw new ValidationError('jersey_number must be a positive integer');
      }
      if (jersey_number > 9999999) {
        throw new ValidationError('jersey_number exceeds maximum value');
      }
    }

    const member = await this.prisma.team_members.findFirst({
      where: {
        team_id: bi(team_id),
        user_id: bi(userId),
        status: { in: ['active', 'inactive'] },
      },
    });
    if (!member) throw new NotFoundError('User is not member of this team');

    const updated = await this.prisma.team_members.update({
      where: { id: member.id },
      data: { jersey_number: jersey_number || null },
    });
    logger.info('Jersey number updated', {
      team_id,
      user_id: userId,
      jersey_number: jersey_number || null,
    });
    return updated;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private serializeSettings(team: any, includeSchedulingInvite = true) {
    const base: any = {
      general: {
        name: team.name,
        description: team.description,
        ...(includeSchedulingInvite ? { owner_id: team.owner_id } : {}),
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
        ...(includeSchedulingInvite
          ? {
              is_payment_deadline_active: this.team.isPaymentDeadlineActive(
                team.finance_payment_start_day,
                team.finance_payment_end_day,
              ),
            }
          : {}),
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
        auto_session_creation_time: utcToGmt7(
          team.auto_session_creation_time || '03:00',
        ),
        checkin_creation_day: team.checkin_creation_day || 'mon',
        checkin_creation_time: utcToGmt7(team.checkin_creation_time || '20:00'),
        checkin_start_day: team.checkin_start_day || 'fri',
        checkin_end_day: team.checkin_end_day || 'tue',
        checkin_deadline_time: utcToGmt7(
          team.checkin_deadline_time || team.checkin_creation_time || '20:00',
        ),
      },
    };
    if (includeSchedulingInvite) {
      base.invite = { code: team.invite_code };
    }
    return base;
  }
}
