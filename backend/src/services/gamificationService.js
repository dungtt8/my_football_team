const db = require('../config/database');
const logger = require('../utils/logger');

class GamificationService {
  /**
   * Get current month in YYYY-MM format
   * @returns {string} Current month in format YYYY-MM (e.g., '2026-06')
   */
  getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Add points to a user for a specific reason
   * @param {number} userId - User ID
   * @param {number} points - Points to add (can be positive or negative)
   * @param {string} reason - Reason for points (e.g., 'attendance', 'quiz_correct', 'penalty')
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Created point record
   * @throws {Error} If insertion fails
   */
  async addPoints(userId, points, reason, teamId) {
    try {
      const month = this.getCurrentMonth();

      const result = await db('user_points').insert({
        user_id: userId,
        team_id: teamId,
        points,
        reason,
        month,
        created_at: db.fn.now()
      }).returning('*');

      logger.info('Points added', {
        userId,
        teamId,
        points,
        reason,
        month
      });

      return result[0];
    } catch (error) {
      logger.error('Failed to add points', {
        userId,
        teamId,
        points,
        reason,
        error: error.message
      });
      throw new Error(`Failed to add points: ${error.message}`);
    }
  }

  /**
   * Get leaderboard for a team in a specific month
   * Returns top 100 active users ranked by total points (descending)
   * @param {number} teamId - Team ID
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Array>} Array of leaderboard entries with user info and total points
   * @throws {Error} If query fails
   */
  async getLeaderboard(teamId, month) {
    try {
      const result = await db('user_points')
        .select(
          // Alias to user_id — frontend LeaderboardEntry matches on user_id/userId
          'u.id as user_id',
          'u.email',
          'u.full_name',
          'tm.role',
          db.raw('COALESCE(SUM(up.points), 0) as total_points'),
          db.raw('COUNT(*) as transaction_count')
        )
        .from('user_points as up')
        .leftJoin('users as u', 'up.user_id', 'u.id')
        .leftJoin('team_members as tm', function() {
          this.on('tm.user_id', '=', 'up.user_id').andOn('tm.team_id', '=', 'up.team_id')
        })
        .where('up.team_id', teamId)
        .where('up.month', month)
        // NOTE: leftJoin + where('u.status', 'active') together behave like an
        // INNER join here — rows where the leftJoin found no matching user (or a
        // non-active one) get filtered out by the where clause. This is intentional:
        // the leaderboard should only ever show currently-active users, so points
        // from users with no active user record are silently excluded rather than
        // shown with null user info. Do not "fix" this to a true left join without
        // also deciding what to render for a null user.
        .where('u.status', 'active')
        .groupBy('u.id', 'u.email', 'u.full_name', 'tm.role')
        .orderBy('total_points', 'desc')
        .limit(100);

      // Add rank to each entry
      const leaderboard = result.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      logger.info('Leaderboard retrieved', {
        teamId,
        month,
        count: leaderboard.length
      });

      return leaderboard;
    } catch (error) {
      // Handle missing table gracefully - return empty leaderboard
      if (error.message.includes('relation "user_points" does not exist')) {
        logger.warn('user_points table does not exist yet', { teamId, month });
        return [];
      }
      logger.error('Failed to get leaderboard', {
        teamId,
        month,
        error: error.message
      });
      throw new Error(`Failed to get leaderboard: ${error.message}`);
    }
  }

  /**
   * Get statistics for a specific user in a team for a specific month
   * @param {number} userId - User ID
   * @param {number} teamId - Team ID
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Object>} User stats including total_points, rank, and month
   * @throws {Error} If query fails
   */
  async getUserStats(userId, teamId, month) {
    try {
      // Get user's total points
      const userStats = await db('user_points')
        .select(db.raw('COALESCE(SUM(points), 0) as total_points'))
        .where('user_id', userId)
        .where('team_id', teamId)
        .where('month', month)
        .first();

      const userTotalPoints = userStats?.total_points || 0;

      // Calculate rank: count users with higher total points
      // NOTE: leftJoin + where('u.status', 'active') intentionally behaves like an
      // INNER join, filtering rank computation to active users only — see the
      // matching comment in getLeaderboard() above for the rationale.
      const usersWithHigherPoints = await db('user_points as up')
        .select('up.user_id')
        .from('user_points as up')
        .leftJoin('users as u', 'up.user_id', 'u.id')
        .where('up.team_id', teamId)
        .where('up.month', month)
        .where('u.status', 'active')
        .groupBy('up.user_id', 'u.id')
        .having(db.raw('COALESCE(SUM(up.points), 0) > ?', [userTotalPoints]));

      const rank = usersWithHigherPoints.length + 1;

      // Attendance counts for the month (frontend stats cards read these)
      const attendanceCounts = await db('attendance_checkins as ac')
        .join('attendance_sessions as s', 's.id', 'ac.session_id')
        .where('ac.user_id', userId)
        .where('ac.team_id', teamId)
        .whereRaw("TO_CHAR(s.session_date, 'YYYY-MM') = ?", [month])
        .select(
          db.raw("COUNT(*) FILTER (WHERE ac.response = 'yes') as attended"),
          db.raw("COUNT(*) FILTER (WHERE ac.response = 'no') as absent")
        )
        .first();

      const stats = {
        user_id: userId,
        team_id: teamId,
        month,
        total_points: userTotalPoints,
        rank,
        attended: Number(attendanceCounts?.attended || 0),
        absent: Number(attendanceCounts?.absent || 0)
      };

      logger.info('User stats retrieved', stats);

      return stats;
    } catch (error) {
      // Handle missing table gracefully - return zero points with rank 1
      if (error.message.includes('relation "user_points" does not exist')) {
        logger.warn('user_points table does not exist yet', { userId, teamId, month });
        return {
          user_id: userId,
          team_id: teamId,
          month,
          total_points: 0,
          rank: 1,
          attended: 0,
          absent: 0
        };
      }
      logger.error('Failed to get user stats', {
        userId,
        teamId,
        month,
        error: error.message
      });
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }

  /**
   * Archive monthly leaderboard - store top 3 users in leaderboard_archives table
   * @param {number} teamId - Team ID
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Object>} Archive record containing top 3 users
   * @throws {Error} If archival fails
   */
  async archiveMonthlyLeaderboard(teamId, month) {
    try {
      // Get top 3 users
      const top3 = await db('user_points')
        .select(
          'u.id',
          'u.email',
          'u.full_name',
          db.raw('COALESCE(SUM(up.points), 0) as total_points')
        )
        .from('user_points as up')
        .leftJoin('users as u', 'up.user_id', 'u.id')
        .where('up.team_id', teamId)
        .where('up.month', month)
        .where('u.status', 'active')
        .groupBy('u.id', 'u.email', 'u.full_name')
        .orderBy('total_points', 'desc')
        .limit(3);

      // Insert archive record — column is `top_3` per migration 004_attendance.js
      const archiveRecord = await db('leaderboard_archives').insert({
        team_id: teamId,
        month,
        top_3: JSON.stringify(top3),
        created_at: db.fn.now()
      }).returning('*');

      logger.info('Leaderboard archived', {
        teamId,
        month,
        top3Count: top3.length
      });

      return {
        ...archiveRecord[0],
        top_3: top3
      };
    } catch (error) {
      logger.error('Failed to archive leaderboard', {
        teamId,
        month,
        error: error.message
      });
      throw new Error(`Failed to archive leaderboard: ${error.message}`);
    }
  }
}

module.exports = new GamificationService();
