import {
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TeamService } from '../team/team.service';
import { Public } from '../../common/decorators/public.decorator';
import { ValidationError } from '../../common/errors/business-errors';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/handlers/authHandler.js + phoneAuthHandler.js.
 * Both routes are unauthenticated (Public).
 */
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly team: TeamService,
  ) {}

  @Post('zalo/callback')
  @Public()
  @HttpCode(200)
  async zaloCallback(@Query('code') code: string) {
    if (!code) throw new ValidationError('Authorization code is required');

    logger.info('Zalo OAuth callback initiated', {
      code: code.substring(0, 10),
    });

    let accessToken: string;
    try {
      accessToken = await this.auth.exchangeZaloCode(code);
    } catch (error) {
      throw new ValidationError('Invalid or expired authorization code');
    }

    const zaloUserData = await this.auth.fetchZaloUserInfo(accessToken);
    logger.info('Zalo user info fetched', {
      zalo_user_id: zaloUserData.zalo_user_id,
    });

    let user: any = null;
    try {
      user = await this.prisma.users.findFirst({
        where: { zalo_user_id: zaloUserData.zalo_user_id },
      });
    } catch (dbError: any) {
      logger.warn('Database query failed, proceeding with new user creation', {
        error: dbError.message,
      });
    }

    if (!user) {
      logger.info('New user detected, creating team and user', {
        zalo_user_id: zaloUserData.zalo_user_id,
        email: zaloUserData.email,
      });
      // NOTE: preserved from the Express handler — a mock user object is
      // returned rather than persisted.
      user = {
        id: 1,
        team_id: 1,
        email: zaloUserData.email,
        full_name: zaloUserData.full_name,
        zalo_user_id: zaloUserData.zalo_user_id,
        role: 'owner',
        status: 'active',
      };
    } else {
      logger.info('Existing user found, updating last login');
      user.last_login_at = new Date();
    }

    const token = this.auth.generateJWT(user);
    logger.info('User authenticated successfully', {
      user_id: user.id,
      team_id: user.team_id,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team_id: user.team_id,
      },
    };
  }

  @Post('phone/login')
  @Public()
  @HttpCode(200)
  async phoneLogin(@Body() body: any) {
    const { phone, full_name } = body;
    if (!phone) throw new ValidationError('Phone number is required');
    if (!full_name) throw new ValidationError('Full name is required');

    const phoneRegex = /^[0-9+\-\s()]{10,}$/;
    if (!phoneRegex.test(phone)) {
      throw new ValidationError('Invalid phone number format');
    }

    logger.info('Phone auth initiated', {
      phone: phone.substring(0, 7) + '****',
    });

    let user: any = await this.prisma.users.findFirst({ where: { phone } });
    if (!user) {
      const email = `phone_${phone.replace(/\D/g, '')}@football-team.local`;
      user = await this.prisma.users.create({
        data: { phone, full_name, email, status: 'active', created_at: new Date() },
      });
      logger.info('New user created via phone', { user_id: user.id });
    } else {
      await this.prisma.users.update({
        where: { id: user.id },
        data: { full_name, last_login_at: new Date() },
      });
      user = { ...user, full_name };
    }

    const allTeams = await this.team.getUserTeams(user.id);

    let currentTeam: any = null;
    let currentRole = 'member';
    if (allTeams.length > 0) {
      const firstTeam = allTeams[0];
      currentTeam = { id: firstTeam.id, name: firstTeam.name };
      currentRole = firstTeam.role;
    }

    const token = this.auth.generateJWT(
      {
        id: user.id,
        team_id: currentTeam?.id || null,
        email: user.email,
        role: currentRole,
        zalo_user_id: user.zalo_user_id,
      },
      allTeams,
    );

    if (!currentTeam) {
      logger.info('User has no team, redirecting to onboarding', {
        user_id: user.id,
      });
      return {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          full_name: user.full_name,
          role: 'member',
          team_id: null,
        },
        team: null,
        has_team: false,
        teams: [],
      };
    }

    logger.info('User authenticated', {
      user_id: user.id,
      role: currentRole,
      team_id: currentTeam.id,
      total_teams: allTeams.length,
    });
    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        full_name: user.full_name,
        role: currentRole,
        team_id: currentTeam.id,
      },
      team: currentTeam,
      has_team: true,
      teams: allTeams,
    };
  }
}
