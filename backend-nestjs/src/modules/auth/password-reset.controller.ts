import { Body, Controller, HttpCode, HttpException, Post } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  AuthenticationError,
  ValidationError,
} from '../../common/errors/business-errors';
import logger from '../../common/utils/logger';

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const normalizePhone = (value: any): string => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
};

const PHONE_DIGITS_SQL = "regexp_replace(phone, '[^0-9]', '', 'g')";
const NORMALIZED_PHONE_SQL = `CASE
  WHEN ${PHONE_DIGITS_SQL} LIKE '84%' THEN '0' || substring(${PHONE_DIGITS_SQL} from 3)
  ELSE ${PHONE_DIGITS_SQL}
END`;
const FIND_USER_SQL = `SELECT * FROM users
  WHERE status = 'active' AND deleted_at IS NULL AND ${NORMALIZED_PHONE_SQL} = $1
  LIMIT 1`;

/**
 * Port of backend/src/handlers/passwordResetHandler.js (phone + Zalo OTP).
 * password_reset_code is not in the Prisma schema, so raw SQL is used.
 */
@Controller('api/auth/password-reset')
export class PasswordResetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  private clearStoredReset(userId: any) {
    return this.prisma.exec(
      'UPDATE password_reset_code SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL',
      userId,
    );
  }

  private async verifyResetCode(tx: any, userId: any, code: string) {
    const rows = await tx.$queryRawUnsafe(
      `SELECT * FROM password_reset_code
       WHERE user_id = $1 AND consumed_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      userId,
    );
    const reset = rows[0];
    if (!reset || reset.attempts >= MAX_ATTEMPTS) return { status: 'expired' };

    if (!(await bcrypt.compare(code, reset.code_hash))) {
      await tx.$executeRawUnsafe(
        'UPDATE password_reset_code SET attempts = attempts + 1 WHERE id = $1',
        reset.id,
      );
      return { status: 'invalid' };
    }
    return { status: 'valid', reset };
  }

  private throwResetCodeError(status: string): never {
    if (status === 'invalid') throw new AuthenticationError('Mã xác nhận không đúng');
    throw new AuthenticationError('Mã xác nhận không hợp lệ hoặc đã hết hạn');
  }

  private parseCode(code: any): string {
    const value = String(code || '').trim();
    if (!/^\d{6}$/.test(value)) throw new ValidationError('Mã xác nhận phải gồm 6 chữ số');
    return value;
  }

  private parsePhone(raw: any): string {
    const phone = normalizePhone(raw);
    if (!/^0\d{9}$/.test(phone)) throw new ValidationError('Số điện thoại không hợp lệ');
    return phone;
  }

  @Post('request')
  @Public()
  @HttpCode(200)
  async request(@Body() body: any) {
    const phone = this.parsePhone(body?.phone);

    const users = await this.prisma.raw<any[]>(FIND_USER_SQL, phone);
    const user = users[0];
    if (!user) {
      throw new HttpException(
        { sent: false, error: 'Không tìm thấy tài khoản với số điện thoại này!' },
        404,
      );
    }
    if (!user.zalo_user_id) {
      throw new HttpException(
        { sent: false, error: 'Tài khoản chưa liên kết Zalo!' },
        400,
      );
    }

    const latest = await this.prisma.raw<any[]>(
      'SELECT created_at FROM password_reset_code WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      user.id,
    );
    if (
      latest[0] &&
      Date.now() - new Date(latest[0].created_at).getTime() <
        RESEND_COOLDOWN_SECONDS * 1000
    ) {
      throw new HttpException(
        { error: 'Vui lòng đợi 60 giây trước khi yêu cầu mã mới' },
        429,
      );
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.clearStoredReset(user.id);
    await this.prisma.exec(
      'INSERT INTO password_reset_code (user_id, code_hash, expires_at) VALUES ($1, $2, $3)',
      user.id,
      codeHash,
      expiresAt,
    );

    try {
      await this.notification.sendZaloMessage(user.zalo_user_id, 'PASSWORD_RESET_OTP', {
        code,
        expires_in_minutes: OTP_TTL_MINUTES,
      });
    } catch (error: any) {
      await this.clearStoredReset(user.id);
      throw new Error('Không thể gửi mã xác nhận');
    }

    logger.info('Password reset code requested', { user_id: user.id });
    return { sent: true, message: 'Mã xác nhận đã được gửi đến Zalo của bạn' };
  }

  @Post('verify')
  @Public()
  @HttpCode(200)
  async verify(@Body() body: any) {
    const phone = this.parsePhone(body?.phone);
    const code = this.parseCode(body?.code);

    const result = await this.prisma.$transaction(async (tx: any) => {
      const users = await tx.$queryRawUnsafe(`${FIND_USER_SQL} FOR UPDATE`, phone);
      if (!users[0]) return { status: 'expired' };
      return this.verifyResetCode(tx, users[0].id, code);
    });
    if (result.status !== 'valid') this.throwResetCodeError(result.status);

    return { verified: true, message: 'Mã xác nhận hợp lệ' };
  }

  @Post('confirm')
  @Public()
  @HttpCode(200)
  async confirm(@Body() body: any) {
    const phone = this.parsePhone(body?.phone);
    const code = this.parseCode(body?.code);
    const newPassword = String(body?.new_password || '');
    const newPasswordConfirm = String(body?.new_password_confirm || '');

    if (newPassword.length < 8) {
      throw new ValidationError('Mật khẩu mới phải có ít nhất 8 ký tự');
    }
    if (newPassword !== newPasswordConfirm) {
      throw new ValidationError('Mật khẩu xác nhận không khớp');
    }

    const result: any = await this.prisma.$transaction(async (tx: any) => {
      const users = await tx.$queryRawUnsafe(`${FIND_USER_SQL} FOR UPDATE`, phone);
      const user = users[0];
      if (!user) return { status: 'expired' };

      const verification: any = await this.verifyResetCode(tx, user.id, code);
      if (verification.status !== 'valid') return verification;

      if (await bcrypt.compare(newPassword, user.password_hash || '')) {
        return { status: 'same_password' };
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await tx.$executeRawUnsafe('UPDATE users SET password_hash = $1 WHERE id = $2', hash, user.id);
      await tx.$executeRawUnsafe(
        'UPDATE password_reset_code SET consumed_at = now() WHERE id = $1',
        verification.reset.id,
      );
      return { status: 'completed' };
    });

    if (result.status === 'same_password') {
      throw new ValidationError('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    if (result.status !== 'completed') this.throwResetCodeError(result.status);

    logger.info('Password reset completed', { phone: phone.slice(0, 7) + '****' });
    return { message: 'Đổi mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới' };
  }
}
