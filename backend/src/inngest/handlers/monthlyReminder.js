const db = require('../../config/database');
const zaloService = require('../../services/zaloService');
const gamificationService = require('../../services/gamificationService');
const notificationService = require('../../services/notificationService');
const logger = require('../../utils/logger');
const inngest = require('../../config/inngest');
const { getTeamUsers } = require('../../utils/teamUsers');

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
 * Helper function to get the current day of month (1-31).
 * Uses server time, same as getCurrentMonth() above (job runs on a UTC cron).
 * @returns {number} Day of month
 */
const getCurrentDay = () => new Date().getDate();

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
          top_3_count: archiveResult.top_3.length
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
        const activeMembers = await getTeamUsers(team.id, {
          status: 'active',
          columns: ['u.id', 'u.zalo_user_id', 'u.full_name'],
        });

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
// Auto-create team fund campaigns
// Triggered: every day at 01:30 UTC.
// Action: For each active team with team_fund_amount set, if a team_fund
//         campaign hasn't been created yet for the current month AND today
//         falls within the team's configured payment window
//         (finance_payment_start_day..finance_payment_end_day, when set),
//         create the campaign and auto-assign it to all active members.
//         Running daily (instead of only on the 1st) makes this self-healing:
//         if a run is skipped/fails on day 1, it catches up on a later day
//         that's still inside the window, and the `fund_month` guard below
//         prevents duplicate creation once it succeeds.
// ============================================================================
const autoCreateTeamFundLogic = async ({ step }) => {
  const currentMonth = getCurrentMonth();
  const currentDay = getCurrentDay();

  logger.info('Auto-create team fund job started', { month: currentMonth, day: currentDay });

  // Fetch all active teams that have team_fund_amount configured
  const teams = await step.run('fetch-eligible-teams', async () => {
    return db('teams')
      .whereNull('deleted_at')
      .whereNotNull('team_fund_amount')
      .where('team_fund_amount', '>', 0)
      .select('id', 'name', 'team_fund_amount', 'finance_payment_start_day', 'finance_payment_end_day');
  });

  logger.info('Teams eligible for team fund', { count: teams.length });

  let created = 0;
  let skipped = 0;

  for (const team of teams) {
    await step.run(`create-team-fund-${team.id}`, async () => {
      // Only run within the team's configured payment window (when one is
      // configured). Teams without a window keep the old "always eligible"
      // behavior so this doesn't regress teams that haven't set one up.
      const { finance_payment_start_day: startDay, finance_payment_end_day: endDay } = team;
      if (startDay && endDay && (currentDay < startDay || currentDay > endDay)) {
        logger.info('Outside configured payment window, skipping for now', {
          team_id: team.id,
          day: currentDay,
          window: [startDay, endDay]
        });
        return;
      }

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

      // Create team_fund campaign + assignments atomically
      const { campaignId, activeMembers } = await db.transaction(async (trx) => {
        const [insertedCampaign] = await trx('campaigns').insert({
          team_id: team.id,
          created_by: null, // system-created
          name: `Quỹ đội tháng ${currentMonth}`,
          amount_per_member: team.team_fund_amount,
          campaign_type: 'team_fund',
          fund_month: currentMonth,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }).returning('id');
        const insertedCampaignId = insertedCampaign.id;

        // Auto-assign to all active members
        const members = await trx('team_members')
          .where('team_id', team.id)
          .where('status', 'active')
          .select('user_id');

        if (members.length > 0) {
          const assignments = members.map(m => ({
            campaign_id: insertedCampaignId,
            user_id: m.user_id,
            status: 'pending_confirmation',
            created_at: new Date(),
            updated_at: new Date()
          }));
          await trx('campaign_assignments').insert(assignments);
        }

        return { campaignId: insertedCampaignId, activeMembers: members };
      });

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
  { cron: '00 17 * * *' }, // every day at 17:00 UTC — see autoCreateTeamFundLogic for the guard logic
  autoCreateTeamFundLogic
);

module.exports = monthlyReminderHandler;
module.exports.autoCreateTeamFundHandler = autoCreateTeamFundHandler;
module.exports.logic = monthlyReminderLogic;
module.exports.autoCreateTeamFundLogic = autoCreateTeamFundLogic;
