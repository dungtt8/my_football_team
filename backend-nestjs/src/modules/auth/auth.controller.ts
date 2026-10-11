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
import { AuthenticationError, ValidationError } from '../../common/errors/business-errors';
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

    const user: any = await this.prisma.users.findFirst({
      where: {
        zalo_user_id: zaloUserData.zalo_user_id,
        status: 'active',
        deleted_at: null,
      },
    });
    // Never mint a token for an unknown identity; Zalo accounts must be
    // linked to an existing user first.
    if (!user) {
      throw new AuthenticationError('Tài khoản Zalo chưa được liên kết');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });
    return this.buildAuthResponse(user, false);
  }

  @Post('phone/login')
  @Public()
  @HttpCode(200)
  async phoneLogin(@Body() body: any) {
    const { phone, password } = body;
    this.validatePhoneAndPassword(phone, password);

    logger.info('Phone login initiated', {
      phone: phone.substring(0, 7) + '****',
    });

    const user: any = await this.prisma.users.findFirst({
      where: { phone, deleted_at: null },
    });
    if (!user) {
      throw new AuthenticationError(
        'Số điện thoại chưa có tài khoản, vui lòng đăng ký',
      );
    }

    const ok = await this.team.verifyPassword(password, user.password_hash || '');
    if (!ok) throw new AuthenticationError('Invalid phone number or password');

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });
    return this.buildAuthResponse(user, false);
  }

  @Post('phone/register')
  @Public()
  @HttpCode(200)
  async phoneRegister(@Body() body: any) {
    const { phone, full_name, password } = body;
    this.validatePhoneAndPassword(phone, password);
    if (!full_name) throw new ValidationError('Full name is required');

    const existing = await this.prisma.users.findFirst({ where: { phone } });
    if (existing) {
      throw new ValidationError('Số điện thoại đã có tài khoản, vui lòng đăng nhập');
    }

    const password_hash = await this.team.hashPassword(password);
    const email = `phone_${phone.replace(/\D/g, '')}@football-team.local`;
    const user: any = await this.prisma.users.create({
      data: {
        phone,
        full_name,
        email,
        password_hash,
        status: 'active',
        created_at: new Date(),
      },
    });
    logger.info('New user registered via phone', { user_id: user.id });
    return this.buildAuthResponse(user, true);
  }

  private validatePhoneAndPassword(phone: any, password: any) {
    if (!phone) throw new ValidationError('Phone number is required');
    if (!password) throw new ValidationError('Password is required');
    if (typeof password !== 'string' || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    if (typeof phone !== 'string' || !/^[0-9+\-\s()]{10,}$/.test(phone)) {
      throw new ValidationError('Invalid phone number format');
    }
  }

  // Builds the JWT + response payload shared by login, register and Zalo.
  private async buildAuthResponse(user: any, isNewUser: boolean) {
    const allTeams = await this.team.getUserTeams(user.id);
    const firstTeam = allTeams[0];
    const currentTeam = firstTeam ? { id: firstTeam.id, name: firstTeam.name } : null;
    const currentRole = firstTeam ? firstTeam.role : 'member';

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

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        full_name: user.full_name,
        role: currentRole,
        team_id: currentTeam?.id ?? null,
      },
      team: currentTeam,
      has_team: !!currentTeam,
      teams: allTeams,
      is_new_user: isNewUser,
    };
  }
}
