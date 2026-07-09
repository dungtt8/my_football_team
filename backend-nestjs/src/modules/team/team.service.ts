import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceClosingService } from '../finance/finance-closing.service';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

/**
 * Shared helpers ported from backend/src/handlers/teamHandler.js
 * (getUserTeams, password helpers, invite-code generation).
 */
@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  isPaymentDeadlineActive(startDay?: number, endDay?: number): boolean {
    const today = new Date();
    return FinanceClosingService.isDayInRange(today.getDate(), startDay, endDay);
  }

  async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hash);
    } catch (e: any) {
      logger.warn('bcrypt.compare failed during password verification', {
        error: e.message,
      });
      return false;
    }
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 10);
  }

  /** Returns [{ id, name, role }] for each active team a user belongs to. */
  async getUserTeams(userId: number | string | bigint): Promise<any[]> {
    return this.prisma.raw<any[]>(
      `SELECT t.id, t.name, tm.role
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id = $1 AND tm.status = 'active'
         AND tm.deleted_at IS NULL AND t.deleted_at IS NULL
       ORDER BY t.name`,
      bi(userId),
    );
  }
}
