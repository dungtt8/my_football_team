const db = require('../../config/database');
const zaloService = require('../../services/zaloService');
const gamificationService = require('../../services/gamificationService');
const logger = require('../../utils/logger');
const inngest = require('../../config/inngest');

/**
 * Helper function to get previous month in YYYY-MM format
 * @returns {string} Previous month in YYYY-MM format
 */
const getPreviousMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  
  if (month === 0) {
    // January -> December of previous year
    return `${year - 1}-12`;
  }
  
  return `${year}-${String(month).padStart(2, '0')}`;
};

/**
 * Helper function to get current month in YYYY-MM format
 * @returns {string} Current month in YYYY-MM format
 */
const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Format leaderboard for Zalo message
 * @param {Array} topUsers - Array of top 3 users with their points
 * @returns {string} Formatted leaderboard message
 */
const formatLeaderboardMessage = (topUsers) => {
  let message = '🏆 BXH Tháng Này\n\n';
  
  topUsers.forEach((user, index) => {
    const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
    message += `${medal} ${user.full_name}\n${user.total_points} điểm\n\n`;
  });
  
  return message;
};

// Core handler logic (exported for testing)
const monthlyReminderLogic = async ({ event, step }) => {
  logger.info('Monthly reminder job started');

  const previousMonth = getPreviousMonth();
  const currentMonth = getCurrentMonth();

  // Step 1: Fetch all active teams
  const teams = await step.run('fetch-teams', async () => {
    if (!db || !db.query) {
      return [];
    }
    return db('teams')
      .where('deleted_at', null)
      .select('id', 'name');
  });

  logger.info('Teams fetched for reminder', { count: teams.length });

  // Step 2: For each team, archive previous month leaderboard and send current month summary
  let totalArchived = 0;
  let totalNotifications = 0;

  for (const team of teams) {
    await step.run(`archive-and-notify-team-${team.id}`, async () => {
      try {
        // Archive previous month's leaderboard
        const archiveResult = await gamificationService.archiveMonthlyLeaderboard(team.id, previousMonth);
        totalArchived++;
        
        logger.info('Leaderboard archived for team', {
          team_id: team.id,
          month: previousMonth,
          top_3_count: archiveResult.top_3_users.length
        });

        // Get current month's leaderboard (top 3)
        const currentLeaderboard = await gamificationService.getLeaderboard(team.id, currentMonth);
        const topThreeUsers = currentLeaderboard.slice(0, 3);

        logger.info('Current leaderboard fetched', {
          team_id: team.id,
          month: currentMonth,
          top_3_count: topThreeUsers.length
        });

        // Get all active members in the team to send notifications
        const activeMembers = await db('users')
          .where('team_id', team.id)
          .where('status', 'active')
          .select('id', 'zalo_user_id', 'full_name');

        logger.info(`Processing team ${team.id} with ${activeMembers.length} active members for leaderboard notification`);

        // Send leaderboard summary to each member
        for (const member of activeMembers) {
          try {
            if (topThreeUsers.length > 0 && member.zalo_user_id) {
              const leaderboardMessage = formatLeaderboardMessage(topThreeUsers);
              
              // Send as utility message with formatted leaderboard
              await zaloService.sendUtilityMessage(member.zalo_user_id, leaderboardMessage);
              totalNotifications++;

              logger.info('Leaderboard summary sent to member', {
                team_id: team.id,
                member_id: member.id,
                zalo_user_id: member.zalo_user_id
              });
            }
          } catch (error) {
            logger.error('Failed to send leaderboard summary', {
              team_id: team.id,
              member_id: member.id,
              error: error.message
            });
            // Continue with next member on error
          }
        }

        // Also send fund reminder for existing functionality
        for (const member of activeMembers) {
          try {
            const currentMonthDisplay = new Date().toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
            const fundMessage = `📢 Nhắc nợ quỹ tháng ${currentMonthDisplay}\n\nVui lòng thanh toán trước hết hạn.\nhttps://myteam.revonexus.net/fund`;

            await zaloService.sendUtilityMessage(member.zalo_user_id, fundMessage);
            totalNotifications++;
          } catch (error) {
            logger.error('Failed to send fund reminder', {
              team_id: team.id,
              member_id: member.id,
              error: error.message
            });
            // Continue with next member on error
          }
        }
      } catch (error) {
        logger.error('Failed to process team for archival and notification', {
          team_id: team.id,
          error: error.message
        });
        // Continue with next team on error
      }
    });
  }

  logger.info('Monthly reminder job completed', {
    teamsProcessed: teams.length,
    leaderboardsArchived: totalArchived,
    notificationsSent: totalNotifications
  });

  return {
    processed: teams.length,
    archived: totalArchived,
    notificationsSent: totalNotifications
  };
};

const monthlyReminderHandler = inngest.createFunction(
  {
    id: 'fund.monthly-reminder',
    retryOptions: { maxRetries: 3, initialDelayMs: 300000 } // 5min, 10min, 20min
  },
  { cron: '0 1 1 * *' }, // 1st of month at 01:00 UTC
  monthlyReminderLogic
);

module.exports = monthlyReminderHandler;
module.exports.logic = monthlyReminderLogic;
