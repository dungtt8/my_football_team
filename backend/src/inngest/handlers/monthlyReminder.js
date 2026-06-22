const db = require('../../config/database');
const zaloService = require('../../services/zaloService');
const logger = require('../../utils/logger');
const inngest = require('../../config/inngest');

// Core handler logic (exported for testing)
const monthlyReminderLogic = async ({ event, step }) => {
  logger.info('Monthly reminder job started');

  // Step 1: Fetch all active teams
  const teams = await step.run('fetch-teams', async () => {
    // Mock: return empty array (real DB call would happen here)
    if (!db || !db.query) {
      return [];
    }
    return db('teams')
      .where('deleted_at', null)
      .select('id', 'name');
  });

  logger.info('Teams fetched for reminder', { count: teams.length });

  // Step 2: For each team, fetch active members and send reminders
  let totalMessagesQueued = 0;

  for (const team of teams) {
    await step.run(`process-team-${team.id}`, async () => {
      const activeMembers = db && db.query ? await db('teams')
        .where('team_id', team.id)
        .where('status', 'active')
        .select('id', 'zalo_user_id', 'full_name') : [];

      logger.info(`Processing team ${team.id} with ${activeMembers.length} active members`);

      for (const member of activeMembers) {
        try {
          const currentMonth = new Date().toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
          const message = `📢 Nhắc nợ quỹ tháng ${currentMonth}\n\nVui lòng thanh toán trước hết hạn.\nhttps://myteam.revonexus.net/fund`;

          await zaloService.sendUtilityMessage(member.zalo_user_id, message);
          totalMessagesQueued++;
        } catch (error) {
          logger.error('Failed to send reminder', {
            team_id: team.id,
            member_id: member.id,
            error: error.message
          });
          // Continue with next member on error
        }
      }
    });
  }

  logger.info('Monthly reminder job completed', { totalMessagesQueued });

  return {
    processed: teams.length,
    messagesQueued: totalMessagesQueued
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
