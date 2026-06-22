const { serve } = require('inngest/express');
const inngest = require('../config/inngest');
const {
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction
} = require('../inngest/events');

// Register all functions
const functions = [
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction
];

// Export handler
const inngestHandler = serve({
  client: inngest,
  functions
});

module.exports = inngestHandler;
