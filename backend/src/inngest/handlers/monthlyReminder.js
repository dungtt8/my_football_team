const db = require('../../config/database');
const zaloService = require('../../services/zaloService');
const gamificationService = require('../../services/gamificationService');
const notificationService = require('../../services/notificationService');
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
      .whereNull('deleted_at')
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

// ============================================================================
// Auto-create team fund campaigns monthly
// Triggered: 1st of each month at 01:30 UTC (after monthlyReminder)
// Action: For each active team with team_fund_amount set, create a team_fund campaign
//         and auto-assign to all active members
// ============================================================================
const autoCreateTeamFundLogic = async ({ step }) => {
  const currentMonth = getCurrentMonth();

  logger.info('Auto-create team fund job started', { month: currentMonth });

  // Fetch all active teams that have team_fund_amount configured
  const teams = await step.run('fetch-eligible-teams', async () => {
    return db('teams')
      .whereNull('deleted_at')
      .whereNotNull('team_fund_amount')
      .where('team_fund_amount', '>', 0)
      .select('id', 'name', 'team_fund_amount');
  });

  logger.info('Teams eligible for team fund', { count: teams.length });

  let created = 0;
  let skipped = 0;

  for (const team of teams) {
    await step.run(`create-team-fund-${team.id}`, async () => {
      // Check if already created for this month
      const existing = await db('campaigns')
        .where('team_id', team.id)
        .where('campaign_type', 'team_fund')
        .where('fund_month', currentMonth)
        .first();

      if (existing) {
        skipped++;
        logger.info('Team fund already created for this month', {
          team_id: team.id,
          month: currentMonth
        });
        return;
      }

      // Create team_fund campaign
      const [campaignId] = await db('campaigns').insert({
        team_id: team.id,
        created_by: null, // system-created
        name: `Quỹ đội tháng ${currentMonth}`,
        amount_per_member: team.team_fund_amount,
        campaign_type: 'team_fund',
        fund_month: currentMonth,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Auto-assign to all active members
      const activeMembers = await db('team_members')
        .where('team_id', team.id)
        .where('status', 'active')
        .select('user_id');

      if (activeMembers.length > 0) {
        const assignments = activeMembers.map(m => ({
          campaign_id: campaignId,
          user_id: m.user_id,
          status: 'pending_confirmation',
          created_at: new Date(),
          updated_at: new Date()
        }));
        await db('campaign_assignments').insert(assignments);
      }

      // Emit event for notifications — use emitEvent() (not inngest.send directly)
      // so a missing INNGEST_EVENT_KEY or Inngest outage can't fail this step
      // after the campaign has already been created.
      await notificationService.emitEvent('campaign.created', {
        campaign_id: campaignId,
        team_id: team.id,
        campaign_name: `Quỹ đội tháng ${currentMonth}`,
        amount_per_member: team.team_fund_amount,
        campaign_type: 'team_fund',
        fund_month: currentMonth
      });

      created++;
      logger.info('Team fund campaign created', {
        team_id: team.id,
        campaign_id: campaignId,
        month: currentMonth,
        amount_per_member: team.team_fund_amount,
        member_count: activeMembers.length
      });
    });
  }

  logger.info('Auto-create team fund job completed', {
    month: currentMonth,
    created,
    skipped
  });

  return { month: currentMonth, created, skipped };
};

const autoCreateTeamFundHandler = inngest.createFunction(
  {
    id: 'fund.auto-create-team-fund',
    retryOptions: { maxRetries: 3, initialDelayMs: 60000 }
  },
  { cron: '30 1 1 * *' }, // 1st of month at 01:30 UTC
  autoCreateTeamFundLogic
);

module.exports = monthlyReminderHandler;
module.exports.autoCreateTeamFundHandler = autoCreateTeamFundHandler;
module.exports.logic = monthlyReminderLogic;
module.exports.autoCreateTeamFundLogic = autoCreateTeamFundLogic;
