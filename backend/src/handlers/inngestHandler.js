const { serve } = require('inngest/express');
const inngest = require('../config/inngest');
const {
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction,
  autoCreateSessionsScheduledJob,
  financeClosingCheckScheduledJob
} = require('../inngest/events');

// Register all functions
const functions = [
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction,
  autoCreateSessionsScheduledJob,
  financeClosingCheckScheduledJob
];

// Export handler
const inngestHandler = serve({
  client: inngest,
  functions
});

module.exports = inngestHandler;
