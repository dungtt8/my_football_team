import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundError, ValidationError } from '../../common/errors/business-errors';
import { bi, currentMonthString } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

const GOAL_POINTS = 2;
const ASSIST_POINTS = 1;
const LEDGER_REASONS = [
  'match_performance',
  'match_performance_adjustment',
  'match_performance_revoked',
];

/**
 * Port of backend/src/services/matchPerformanceService.js — self-reported
 * goals/assists subject to manager approval, plus the official match result.
 * match_performances is not in the Prisma schema, so raw SQL is used.
 */
@Injectable()
export class MatchPerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  private computePoints(goals: number, assists: number) {
    return goals * GOAL_POINTS + assists * ASSIST_POINTS;
  }

  private async assertMatchSession(sessionId: any, teamId: any) {
    const session = await this.prisma.attendance_sessions.findFirst({
      where: { id: bi(sessionId), team_id: bi(teamId) },
    });
    if (!session) throw new NotFoundError('Session', sessionId);
    if (session.session_type !== 'match') {
      throw new ValidationError(
        'Match performance tracking only applies to match sessions',
      );
    }
    return session;
  }

  getPerformancesForSession(sessionId: any, teamId: any): Promise<any[]> {
    return this.prisma.raw<any[]>(
      `SELECT mp.id, mp.user_id, mp.goals, mp.assists, mp.status,
              mp.submitted_at, mp.reviewed_by, mp.reviewed_at,
              u.full_name, u.email
       FROM match_performances mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.session_id = $1 AND mp.team_id = $2
       ORDER BY u.full_name`,
      bi(sessionId),
      bi(teamId),
    );
  }

  /** Member creates/updates their own row; always goes back to 'pending'. */
  async submitOwnPerformance(
    sessionId: any,
    userId: any,
    teamId: any,
    { goals, assists }: { goals: number; assists: number },
  ) {
    await this.assertMatchSession(sessionId, teamId);

    const checkin = await this.prisma.attendance_checkins.findFirst({
      where: {
        session_id: bi(sessionId),
        user_id: bi(userId),
        team_id: bi(teamId),
        response: 'yes',
      },
    });
    if (!checkin) {
      throw new ValidationError(
        'Only members who checked in as attending can log match performance',
      );
    }

    const existing = (
      await this.prisma.raw<any[]>(
        'SELECT id, status FROM match_performances WHERE session_id = $1 AND user_id = $2',
        bi(sessionId),
        bi(userId),
      )
    )[0];
    if (existing && existing.status === 'approved') {
      throw new ValidationError('This entry is already approved — ask a manager to edit it');
    }

    const now = new Date();
    if (existing) {
      const rows = await this.prisma.raw<any[]>(
        `UPDATE match_performances
         SET goals = $1, assists = $2, status = 'pending', submitted_at = $3, updated_at = $3
         WHERE id = $4 RETURNING *`,
        goals,
        assists,
        now,
        existing.id,
      );
      return rows[0];
    }

    const rows = await this.prisma.raw<any[]>(
      `INSERT INTO match_performances
         (session_id, user_id, team_id, goals, assists, status, submitted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $6, $6) RETURNING *`,
      bi(sessionId),
      bi(userId),
      bi(teamId),
      goals,
      assists,
      now,
    );
    logger.info('Match performance submitted', { session_id: sessionId, user_id: userId, goals, assists });
    return rows[0];
  }

  /** Manager edits/reviews a row and reconciles the points ledger by delta. */
  async reviewPerformance(
    sessionId: any,
    targetUserId: any,
    reviewerId: any,
    teamId: any,
    { goals, assists, status }: { goals?: number; assists?: number; status: string },
  ) {
    await this.assertMatchSession(sessionId, teamId);

    return this.prisma.$transaction(async (tx: any) => {
      const rows = await tx.$queryRawUnsafe(
        `SELECT * FROM match_performances
         WHERE session_id = $1 AND user_id = $2 AND team_id = $3 FOR UPDATE`,
        bi(sessionId),
        bi(targetUserId),
        bi(teamId),
      );
      const row = rows[0];
      if (!row) throw new NotFoundError('Performance entry', `${sessionId}/${targetUserId}`);

      const newGoals = goals !== undefined ? goals : row.goals;
      const newAssists = assists !== undefined ? assists : row.assists;
      const now = new Date();

      const updated = await tx.$queryRawUnsafe(
        `UPDATE match_performances
         SET goals = $1, assists = $2, status = $3, reviewed_by = $4, reviewed_at = $5, updated_at = $5
         WHERE id = $6 RETURNING *`,
        newGoals,
        newAssists,
        status,
        bi(reviewerId),
        now,
        row.id,
      );

      const prior = await tx.$queryRawUnsafe(
        `SELECT COALESCE(SUM(points), 0) AS total FROM user_points
         WHERE session_id = $1 AND user_id = $2 AND team_id = $3 AND reason = ANY($4)`,
        bi(sessionId),
        bi(targetUserId),
        bi(teamId),
        LEDGER_REASONS,
      );
      const priorTotal = Number(prior[0]?.total || 0);
      const desiredTotal = status === 'approved' ? this.computePoints(newGoals, newAssists) : 0;
      const delta = desiredTotal - priorTotal;

      if (delta !== 0) {
        const reason =
          priorTotal === 0
            ? 'match_performance'
            : desiredTotal === 0
              ? 'match_performance_revoked'
              : 'match_performance_adjustment';
        await tx.user_points.create({
          data: {
            user_id: bi(targetUserId),
            team_id: bi(teamId),
            points: delta,
            reason,
            month: currentMonthString(),
            session_id: bi(sessionId),
          },
        });
      }

      logger.info('Match performance reviewed', { session_id: sessionId, user_id: targetUserId, status, delta });
      return updated[0];
    });
  }

  async setMatchResult(
    sessionId: any,
    teamId: any,
    reviewerId: any,
    { home_score, away_score }: { home_score: any; away_score: any },
  ) {
    await this.assertMatchSession(sessionId, teamId);
    if (!Number.isInteger(home_score) || home_score < 0) {
      throw new ValidationError('home_score must be a non-negative integer');
    }
    if (!Number.isInteger(away_score) || away_score < 0) {
      throw new ValidationError('away_score must be a non-negative integer');
    }

    const now = new Date();
    const rows = await this.prisma.raw<any[]>(
      `UPDATE attendance_sessions
       SET home_score = $1, away_score = $2, result_recorded_by = $3,
           result_recorded_at = $4, updated_at = $4
       WHERE id = $5 RETURNING *`,
      home_score,
      away_score,
      bi(reviewerId),
      now,
      bi(sessionId),
    );
    logger.info('Match result recorded', { session_id: sessionId, home_score, away_score });
    return rows[0];
  }
}
