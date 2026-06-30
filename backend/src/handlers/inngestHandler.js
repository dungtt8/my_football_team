const { serve } = require('inngest/express');
const inngest = require('../config/inngest');
const {
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction,
  autoCreateSessionsScheduledJob,
  financeClosingCheckScheduledJob,
  autoCreateTeamFundHandler
} = require('../inngest/events');

// Register all functions
const functions = [
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction,
  autoCreateSessionsScheduledJob,
  financeClosingCheckScheduledJob,
  autoCreateTeamFundHandler
];

// Export handler
const inngestHandler = serve({
  client: inngest,
  functions
});

module.exports = inngestHandler;
