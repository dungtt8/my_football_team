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
  logger.info('[inngest] request received', { method: req.method, path: req.path });
  return serveHandler(req, res, next);
};

module.exports = inngestHandler;
