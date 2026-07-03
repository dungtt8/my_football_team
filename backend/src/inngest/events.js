const inngest = require('../config/inngest');
const monthlyReminderHandler = require('./handlers/monthlyReminder');
const { autoCreateTeamFundHandler } = require('./handlers/monthlyReminder');
const {
  onApprovalPendingHandler: onApprovalPending,
  onApprovalApprovedHandler: onApprovalApproved,
  onApprovalRejectedHandler: onApprovalRejected,
} = require('./handlers/financeEvents');
const {
  onSessionCreatedHandler: onAttendanceSessionCreated,
  onCheckInHandler: onAttendanceCheckIn,
  onSessionClosedHandler: onAttendanceSessionClosed,
} = require('./handlers/attendanceEvents');
const {
  onCampaignCreatedHandler,
  onCampaignMemberConfirmedHandler,
  onCampaignChargedHandler,
  onCampaignClosedHandler,
} = require('./handlers/campaignEvents');

// Event definitions
const events = {
  // Finance events
  FUND_MONTHLY_REMINDER: 'fund.monthly-reminder',
  FUND_CAMPAIGN_DEADLINE_24H: 'fund.campaign-deadline-24h',
  FUND_TRANSACTION_APPROVED: 'fund.transaction-approved',

  // Campaign events
  CAMPAIGN_ASSIGNMENT_CREATED: 'campaign.assignment-created',
  CAMPAIGN_MEMBER_CONFIRMED: 'campaign.member-confirmed',
  CAMPAIGN_MEMBER_REJECTED: 'campaign.member-rejected',
  CAMPAIGN_CLOSED: 'campaign.closed',

  // Attendance events
  ATTENDANCE_SESSION_CREATED: 'attendance.session-created',
  ATTENDANCE_CHECK_IN: 'attendance.check-in',
  ATTENDANCE_SESSION_CLOSED: 'attendance.session-closed',

  // Zalo events
  ZALO_MESSAGE_FAILED: 'zalo.message-failed'
};

// ============================================================================
// Campaign Event Handlers (Placeholder implementations)
// To be implemented in backend/src/inngest/handlers/campaignEvents.js
// ============================================================================

/**
 * Campaign Assignment Created Handler
 * Triggered when: campaign.assignment-created event is emitted
 * Action: Notify assigned member and co-managers of new campaign assignment
 */
const onCampaignAssignmentCreatedLogic = async ({ event, step }) => {
  const { campaign_id, team_id, assigned_to, assigned_by } = event.data;
  // Implementation: Fetch campaign, member, and co-manager details
  // Send notifications to member and co-managers
  return { status: 'completed', campaign_id };
};

const onCampaignAssignmentCreatedHandler = inngest.createFunction(
  {
    id: 'campaign.assignment-created',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.assignment-created' },
  onCampaignAssignmentCreatedLogic
);

// Note: real "campaign member confirmed" handling lives in
// ./handlers/campaignEvents.js (onCampaignMemberConfirmedHandler), imported above.

/**
 * Campaign Member Rejected Handler
 * Triggered when: campaign.member-rejected event is emitted
 * Action: Notify co-managers that member rejected participation
 */
const onCampaignMemberRejectedLogic = async ({ event, step }) => {
  const { campaign_id, team_id, member_id, rejected_by } = event.data;
  // Implementation: Notify co-managers of member rejection
  // Update campaign assignment status
  return { status: 'completed', campaign_id, member_id };
};

const onCampaignMemberRejectedHandler = inngest.createFunction(
  {
    id: 'campaign.member-rejected',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.member-rejected' },
  onCampaignMemberRejectedLogic
);

// Note: real "campaign closed" handling lives in
// ./handlers/campaignEvents.js (onCampaignClosedHandler), imported above.

// Define functions (to be implemented in separate files)
const createCampaignDeadlineCheckFunction = inngest.createFunction(
  { id: 'fund.campaign-deadline-check' },
  { cron: '0 23 * * *' }, // Daily at 23:00 UTC (06:00 UTC+7)
  async ({ event, step }) => {
    // Placeholder - implemented in next task
    return { status: 'scheduled' };
  }
);

// ============================================================================
// Attendance Event Handlers
// To be implemented in backend/src/inngest/handlers/attendanceEvents.js
// ============================================================================

/**
 * Attendance Session Created Handler
 * Triggered when: attendance.session-created event is emitted
 * Action: Notify team members of new attendance session
 */
const onAttendanceSessionCreatedHandler = inngest.createFunction(
  {
    id: 'attendance.session-created',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  // NOTE: id above uses a hyphen, but the actual event trigger must match what's
  // emitted (attendanceHandler.js / sessionSchedulingService.js use underscores)
  { event: 'attendance.session_created' },
  onAttendanceSessionCreated
);

/**
 * Attendance Check-In Handler
 * Triggered when: attendance.check-in event is emitted
 * Action: Award gamification points for attendance
 */
const onAttendanceCheckInHandler = inngest.createFunction(
  {
    id: 'attendance.check-in',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'attendance.check-in' },
  onAttendanceCheckIn
);

/**
 * Attendance Session Closed Handler
 * Triggered when: attendance.session-closed event is emitted
 * Action: Finalize session attendance, process any pending check-ins
 */
const onAttendanceSessionClosedHandler = inngest.createFunction(
  {
    id: 'attendance.session-closed',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'attendance.session_closed' },
  onAttendanceSessionClosed
);

/**
 * Auto-Create Sessions Scheduled Job
 * Runs hourly to check and create scheduled attendance sessions
 * Each team can configure custom creation time (auto_session_creation_time in HH:mm format UTC)
 * Sessions are only created during the configured hour window for each team
 */
const autoCreateSessionsScheduledJob = inngest.createFunction(
  {
    id: 'attendance.auto-create-sessions',
    retryOptions: { maxRetries: 2, initialDelayMs: 10000 }
  },
  { cron: '0 * * * *' }, // Hourly at top of each hour
  async ({ step }) => {
    const sessionSchedulingService = require('../services/sessionSchedulingService');

    const result = await step.run('process-auto-sessions', async () => {
      return await sessionSchedulingService.processAutoSessions();
    });

    return result;
  }
);

/**
 * Finance Payment Deadline Check Scheduled Job
 * Runs daily at 1 AM UTC to check and send notifications for payment deadlines
 * Sends notification on the first day of payment deadline (monthly recurring)
 */
const financeClosingCheckScheduledJob = inngest.createFunction(
  {
    id: 'finance.payment-deadline-check',
    retryOptions: { maxRetries: 2, initialDelayMs: 10000 }
  },
  { cron: '0 1 * * *' }, // Daily at 1 AM UTC
  async ({ step }) => {
    const financeClosingService = require('../services/financeClosingService');

    // Check for payment deadline starting today and send notifications
    await step.run('check-and-notify-payment-deadline', async () => {
      return await financeClosingService.checkAndNotifyPaymentDeadline();
    });

    return { status: 'completed' };
  }
);
/**
 * Auto-Create Check-in Notifications Scheduled Job
 * Runs daily to create check-in notifications for upcoming sessions
 * Each team can configure when check-in notifications are created
 */
const checkInNotificationScheduledJob = inngest.createFunction(
  {
    id: 'attendance.checkin-notifications',
    retryOptions: { maxRetries: 2, initialDelayMs: 10000 }
  },
  { cron: '0 * * * *' }, // Hourly at top of each hour
  async ({ step }) => {
    const checkinService = require('../services/checkinService');

    const result = await step.run('create-checkin-notifications', async () => {
      return await checkinService.checkAndCreateCheckInNotifications();
    });

    return result;
  }
);


module.exports = {
  events,
  createMonthlyReminderFunction: monthlyReminderHandler,
  autoCreateTeamFundHandler,
  createCampaignDeadlineCheckFunction,
  onApprovalPending,
  onApprovalApproved,
  onApprovalRejected,
  onCampaignCreatedHandler,
  onCampaignAssignmentCreatedHandler,
  onCampaignMemberConfirmedHandler,
  onCampaignMemberRejectedHandler,
  onCampaignChargedHandler,
  onCampaignClosedHandler,
  onAttendanceSessionCreatedHandler,
  onAttendanceCheckInHandler,
  onAttendanceSessionClosedHandler,
  autoCreateSessionsScheduledJob,
  financeClosingCheckScheduledJob,
  checkInNotificationScheduledJob,
};
