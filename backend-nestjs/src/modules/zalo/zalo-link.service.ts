import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { bi } from '../../common/utils/helpers';

const CODE_TTL_MS = 10 * 60 * 1000;

/**
 * Port of backend/src/utils/zaloLinkStore.js — one-time link codes stored in
 * zalo_link_codes so they work across instances.
 */
@Injectable()
export class ZaloLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async generateCode(userId: number | string | bigint): Promise<string> {
    for (;;) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await this.prisma.raw<any[]>(
        'SELECT 1 FROM zalo_link_codes WHERE code = $1',
        code,
      );
      if (existing.length) continue;
      await this.prisma.exec(
        'INSERT INTO zalo_link_codes (code, user_id, expires_at) VALUES ($1, $2, $3)',
        code,
        bi(userId),
        new Date(Date.now() + CODE_TTL_MS),
      );
      return code;
    }
  }

  /** Single use: the code is deleted whether or not it is still valid. */
  async consumeCode(code: string): Promise<bigint | null> {
    const rows = await this.prisma.raw<any[]>(
      'DELETE FROM zalo_link_codes WHERE code = $1 RETURNING user_id, expires_at',
      code,
    );
    const entry = rows[0];
    if (!entry || new Date(entry.expires_at).getTime() < Date.now()) return null;
    return entry.user_id;
  }
}
