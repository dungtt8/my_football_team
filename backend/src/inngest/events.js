const inngest = require('../config/inngest');

// Event definitions
const events = {
  // Finance events
  FUND_MONTHLY_REMINDER: 'fund.monthly-reminder',
  FUND_CAMPAIGN_DEADLINE_24H: 'fund.campaign-deadline-24h',
  FUND_TRANSACTION_APPROVED: 'fund.transaction-approved',

  // Attendance events
  ATTENDANCE_SESSION_CLOSED: 'attendance.session-closed',

  // Zalo events
  ZALO_MESSAGE_FAILED: 'zalo.message-failed'
};

// Define functions (to be implemented in separate files)
const createMonthlyReminderFunction = inngest.createFunction(
  { id: 'fund.monthly-reminder' },
  { cron: '0 1 1 * *' }, // 1st of month at 01:00 UTC
  async ({ event, step }) => {
    // Placeholder - implemented in next task
    return { status: 'scheduled' };
  }
);

const createCampaignDeadlineCheckFunction = inngest.createFunction(
  { id: 'fund.campaign-deadline-check' },
  { cron: '0 23 * * *' }, // Daily at 23:00 UTC (06:00 UTC+7)
  async ({ event, step }) => {
    // Placeholder - implemented in next task
    return { status: 'scheduled' };
  }
);

module.exports = {
  events,
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction
};
