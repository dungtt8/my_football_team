const { serve } = require('inngest/express');
const inngest = require('../config/inngest');
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

// Export handler
const inngestHandler = serve({
  client: inngest,
  functions
});

module.exports = inngestHandler;
