const { serve } = require('inngest/express');
const inngest = require('../config/inngest');
const logger = require('../utils/logger');
const {
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction,
  autoCreateSessionsScheduledJob,
  financeClosingCheckScheduledJob,
  checkInNotificationScheduledJob,
  autoCreateTeamFundHandler,
  onApprovalPending,
  onApprovalApproved,
  onApprovalRejected,
  onAttendanceSessionCreatedHandler,
  onAttendanceCheckInHandler,
  onAttendanceSessionClosedHandler,
  onCampaignCreatedHandler,
  onCampaignAssignmentCreatedHandler,
  onCampaignMemberConfirmedHandler,
  onCampaignMemberRejectedHandler,
  onCampaignChargedHandler,
  onCampaignClosedHandler,
  onPasswordResetRequestedHandler,
} = require('../inngest/events');

// Register all functions
// NOTE: previously only a handful of these were listed here, so most event-driven
// notifications (attendance, approvals, campaigns) and the check-in notification
// cron were defined but never actually invoked by Inngest.
const functions = [
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction,
  autoCreateSessionsScheduledJob,
  financeClosingCheckScheduledJob,
  checkInNotificationScheduledJob,
  autoCreateTeamFundHandler,
  onApprovalPending,
  onApprovalApproved,
  onApprovalRejected,
  onAttendanceSessionCreatedHandler,
  onAttendanceCheckInHandler,
  onAttendanceSessionClosedHandler,
  onCampaignCreatedHandler,
  onCampaignAssignmentCreatedHandler,
  onCampaignMemberConfirmedHandler,
  onCampaignMemberRejectedHandler,
  onCampaignChargedHandler,
  onCampaignClosedHandler,
  onPasswordResetRequestedHandler,
];

logger.info('Inngest functions registered', {
  count: functions.length,
  ids: functions.map(fn => fn.id())
});

// Export handler
const serveHandler = serve({
  client: inngest,
  functions
});

// Wrap to log every hit on /api/inngest (GET = Inngest sync/introspection,
// PUT = Inngest sync, POST = step invocation). Helps confirm whether Inngest
// Cloud is even reaching this endpoint.
const inngestHandler = (req, res, next) => {
  // NOTE: req.path strips the query string by design — logging it alone can
  // never reveal whether Inngest's `fnId`/`stepId` params actually arrived.
  // Log originalUrl + parsed query so a "No function ID found in request"
  // error can be diagnosed from these logs instead of guessed at.
  logger.info('[inngest] request received', {
    method: req.method,
    originalUrl: req.originalUrl,
    query: req.query,
  });
  return serveHandler(req, res, next);
};

module.exports = inngestHandler;
