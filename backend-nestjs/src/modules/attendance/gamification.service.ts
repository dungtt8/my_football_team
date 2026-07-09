import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { bi, toNum } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/services/gamificationService.js.
 */
@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  async addPoints(
    userId: number | string | bigint,
    points: number,
    reason: string,
    teamId: number | string | bigint,
  ): Promise<any> {
    try {
      const month = this.getCurrentMonth();
      const result = await this.prisma.user_points.create({
        data: {
          user_id: bi(userId),
          team_id: bi(teamId),
          points,
          reason,
          month,
        },
      });
      logger.info('Points added', { userId, teamId, points, reason, month });
      return result;
    } catch (error: any) {
      logger.error('Failed to add points', {
        userId,
        teamId,
        points,
        reason,
        error: error.message,
      });
      throw new Error(`Failed to add points: ${error.message}`);
    }
  }

  async getLeaderboard(
    teamId: number | string | bigint,
    month: string,
  ): Promise<any[]> {
    try {
      const result = await this.prisma.raw<any[]>(
        `SELECT u.id AS user_id, u.email, u.full_name, tm.role,
                COALESCE(SUM(up.points), 0) AS total_points,
                COUNT(*) AS transaction_count
         FROM user_points up
         LEFT JOIN users u ON up.user_id = u.id
         LEFT JOIN team_members tm ON tm.user_id = up.user_id AND tm.team_id = up.team_id
         WHERE up.team_id = $1 AND up.month = $2 AND u.status = 'active'
         GROUP BY u.id, u.email, u.full_name, tm.role
         ORDER BY total_points DESC
         LIMIT 100`,
        bi(teamId),
        month,
      );

      const leaderboard = result.map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1,
      }));

      logger.info('Leaderboard retrieved', {
        teamId,
        month,
        count: leaderboard.length,
      });
      return leaderboard;
    } catch (error: any) {
      if (error.message?.includes('relation "user_points" does not exist')) {
        logger.warn('user_points table does not exist yet', { teamId, month });
        return [];
      }
      logger.error('Failed to get leaderboard', {
        teamId,
        month,
        error: error.message,
      });
      throw new Error(`Failed to get leaderboard: ${error.message}`);
    }
  }

  async getUserStats(
    userId: number | string | bigint,
    teamId: number | string | bigint,
    month: string,
  ): Promise<any> {
    try {
      const userStatsRows = await this.prisma.raw<any[]>(
        `SELECT COALESCE(SUM(points), 0) AS total_points
         FROM user_points
         WHERE user_id = $1 AND team_id = $2 AND month = $3`,
        bi(userId),
        bi(teamId),
        month,
      );
      const userTotalPoints = toNum(userStatsRows[0]?.total_points);

      const higher = await this.prisma.raw<any[]>(
        `SELECT up.user_id
         FROM user_points up
         LEFT JOIN users u ON up.user_id = u.id
         WHERE up.team_id = $1 AND up.month = $2 AND u.status = 'active'
         GROUP BY up.user_id, u.id
         HAVING COALESCE(SUM(up.points), 0) > $3`,
        bi(teamId),
        month,
        userTotalPoints,
      );
      const rank = higher.length + 1;

      const attendanceRows = await this.prisma.raw<any[]>(
        `SELECT
           COUNT(*) FILTER (WHERE ac.response = 'yes') AS attended,
           COUNT(*) FILTER (WHERE ac.response = 'no') AS absent
         FROM attendance_checkins ac
         JOIN attendance_sessions s ON s.id = ac.session_id
         WHERE ac.user_id = $1 AND ac.team_id = $2
           AND TO_CHAR(s.session_date, 'YYYY-MM') = $3`,
        bi(userId),
        bi(teamId),
        month,
      );

      const stats = {
        user_id: userId,
        team_id: teamId,
        month,
        total_points: userTotalPoints,
        rank,
        attended: Number(attendanceRows[0]?.attended || 0),
        absent: Number(attendanceRows[0]?.absent || 0),
      };
      logger.info('User stats retrieved', stats);
      return stats;
    } catch (error: any) {
      if (error.message?.includes('relation "user_points" does not exist')) {
        logger.warn('user_points table does not exist yet', {
          userId,
          teamId,
          month,
        });
        return {
          user_id: userId,
          team_id: teamId,
          month,
          total_points: 0,
          rank: 1,
          attended: 0,
          absent: 0,
        };
      }
      logger.error('Failed to get user stats', {
        userId,
        teamId,
        month,
        error: error.message,
      });
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }

  async archiveMonthlyLeaderboard(
    teamId: number | string | bigint,
    month: string,
  ): Promise<any> {
    try {
      const top3 = await this.prisma.raw<any[]>(
        `SELECT u.id, u.email, u.full_name,
                COALESCE(SUM(up.points), 0) AS total_points
         FROM user_points up
         LEFT JOIN users u ON up.user_id = u.id
         WHERE up.team_id = $1 AND up.month = $2 AND u.status = 'active'
         GROUP BY u.id, u.email, u.full_name
         ORDER BY total_points DESC
         LIMIT 3`,
        bi(teamId),
        month,
      );

      // top_3 is jsonb; store the array directly (BigInt/Decimal values are
      // stringified by our global toJSON serializers so JSON storage is safe).
      const normalized = top3.map((r: any) => ({
        id: r.id?.toString?.() ?? r.id,
        email: r.email,
        full_name: r.full_name,
        total_points: toNum(r.total_points),
      }));

      const archiveRecord = await this.prisma.leaderboard_archives.create({
        data: { team_id: bi(teamId), month, top_3: normalized },
      });

      logger.info('Leaderboard archived', {
        teamId,
        month,
        top3Count: top3.length,
      });
      return { ...archiveRecord, top_3: normalized };
    } catch (error: any) {
      logger.error('Failed to archive leaderboard', {
        teamId,
        month,
        error: error.message,
      });
      throw new Error(`Failed to archive leaderboard: ${error.message}`);
    }
  }
}
