const inngest = require('../config/inngest');
const monthlyReminderHandler = require('./handlers/monthlyReminder');
const { onApprovalPending, onApprovalApproved, onApprovalRejected } = require('./handlers/financeEvents');
const { onAttendanceSessionCreated, onAttendanceCheckIn, onAttendanceSessionClosed } = require('./handlers/attendanceEvents');

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

/**
 * Campaign Member Confirmed Handler
 * Triggered when: campaign.member-confirmed event is emitted
 * Action: Notify co-managers that member confirmed participation
 */
const onCampaignMemberConfirmedLogic = async ({ event, step }) => {
  const { campaign_id, team_id, member_id, confirmed_by } = event.data;
  // Implementation: Notify co-managers of member confirmation
  // Update campaign assignment status
  return { status: 'completed', campaign_id, member_id };
};

const onCampaignMemberConfirmedHandler = inngest.createFunction(
  {
    id: 'campaign.member-confirmed',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.member-confirmed' },
  onCampaignMemberConfirmedLogic
);

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

/**
 * Campaign Closed Handler
 * Triggered when: campaign.closed event is emitted
 * Action: Finalize campaign, award gamification points, notify team
 */
const onCampaignClosedLogic = async ({ event, step }) => {
  const { campaign_id, team_id, closed_by } = event.data;
  // Implementation: Calculate results, award points, send notifications
  // Archive campaign data
  return { status: 'completed', campaign_id };
};

const onCampaignClosedHandler = inngest.createFunction(
  {
    id: 'campaign.closed',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.closed' },
  onCampaignClosedLogic
);

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
  { event: 'attendance.session-created' },
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
  { event: 'attendance.session-closed' },
  onAttendanceSessionClosed
);

module.exports = {
  events,
  createMonthlyReminderFunction: monthlyReminderHandler,
  createCampaignDeadlineCheckFunction,
  onApprovalPending,
  onApprovalApproved,
  onApprovalRejected,
  onCampaignAssignmentCreatedHandler,
  onCampaignMemberConfirmedHandler,
  onCampaignMemberRejectedHandler,
  onCampaignClosedHandler,
  onAttendanceSessionCreatedHandler,
  onAttendanceCheckInHandler,
  onAttendanceSessionClosedHandler
};
