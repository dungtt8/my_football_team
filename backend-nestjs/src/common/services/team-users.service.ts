import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface GetTeamUsersOpts {
  role?: string;
  status?: string | null;
  excludeUserId?: number | string | bigint;
  columns?: string[];
}

/**
 * Port of backend/src/utils/teamUsers.js.
 *
 * `users` has no team_id/role column — those live on team_members — so scoping
 * users to a team must always go through team_members.
 */
@Injectable()
export class TeamUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamUsers(
    teamId: number | string | bigint,
    opts: GetTeamUsersOpts = {},
  ): Promise<any[]> {
    const {
      role,
      status = 'active',
      excludeUserId,
      columns = ['u.id', 'u.zalo_user_id', 'u.full_name', 'u.email'],
    } = opts;

    const params: any[] = [BigInt(teamId as any)];
    let sql = `SELECT ${columns.join(', ')}
      FROM users u
      JOIN team_members tm ON tm.user_id = u.id
      WHERE tm.team_id = $1`;

    if (status) {
      params.push(status);
      sql += ` AND tm.status = $${params.length}`;
    }
    if (role) {
      params.push(role);
      sql += ` AND tm.role = $${params.length}`;
    }
    if (excludeUserId) {
      params.push(BigInt(excludeUserId as any));
      sql += ` AND u.id <> $${params.length}`;
    }

    return this.prisma.raw<any[]>(sql, ...params);
  }

  async getTeamUser(
    userId: number | string | bigint,
    teamId: number | string | bigint,
  ): Promise<any> {
    const rows = await this.prisma.raw<any[]>(
      `SELECT u.*
       FROM users u
       JOIN team_members tm ON tm.user_id = u.id
       WHERE u.id = $1 AND tm.team_id = $2
       LIMIT 1`,
      BigInt(userId as any),
      BigInt(teamId as any),
    );
    return rows[0] || null;
  }
}
