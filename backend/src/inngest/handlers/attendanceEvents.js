const db = require('../../config/database');
const inngest = require('../../config/inngest');
const notificationService = require('../../services/notificationService');
const gamificationService = require('../../services/gamificationService');
const logger = require('../../utils/logger');
const { getTeamUsers, getTeamUser } = require('../../utils/teamUsers');

// ============================================================================
// onSessionCreated Handler
// Triggered when: attendance.session_created event is emitted
// Action: Fetch all active team members and notify them of new session
// ============================================================================
const onSessionCreatedLogic = async ({ event, step }) => {
  const { session_id, team_id, session_date, location, session_type, created_by } = event.data;

  logger.info('Processing attendance.session_created event', {
    session_id,
    team_id,
    session_date,
    session_type,
    created_by
  });

  // Step 1: Fetch session details
  const session = await step.run('fetch-session', async () => {
    return db('attendance_sessions')
      .where('id', session_id)
      .where('team_id', team_id)
      .first();
  });

  if (!session) {
    logger.warn('Session not found', { session_id, team_id });
    throw new Error(`Session ${session_id} not found`);
  }

  // Step 2: Fetch all active team members
  const teamMembers = await step.run('fetch-team-members', async () => {
    return getTeamUsers(team_id, { status: 'active' });
  });

  logger.info('Found team members for notification', {
    team_id,
    count: teamMembers.length
  });

  // Step 3: Send Zalo notifications to each team member
  let notificationsSent = 0;
  let notificationsFailed = 0;

  for (const member of teamMembers) {
    await step.run(`send-notification-to-${member.id}`, async () => {
      try {
        const sessionDateFormatted = new Date(session.session_date).toLocaleDateString('vi-VN');
        await notificationService.sendZaloMessage(
          member.zalo_user_id,
          'SESSION_CREATED',
          {
            session_date: sessionDateFormatted,
            location: session.location || 'TBD',
            session_type: session.session_type === 'training' ? 'Training' : 'Match'
          }
        );
        notificationsSent++;
        logger.info('Session created notification sent to team member', {
          member_id: member.id,
          team_id,
          session_id
        });
      } catch (error) {
        notificationsFailed++;
        logger.error('Failed to send session created notification to team member', {
          member_id: member.id,
          team_id,
          session_id,
          error: error.message
        });
        // Continue with next member on error
      }
    });
  }

  // Step 4: Log the action
  await step.run('log-action', async () => {
    logger.info('Session creation notifications completed', {
      session_id,
      team_id,
      session_type,
      notificationsSent,
      notificationsFailed
    });
  });

  return {
    status: 'completed',
    session_id,
    notificationsSent,
    notificationsFailed
  };
};

const onSessionCreatedHandler = inngest.createFunction(
  {
    id: 'attendance.session_created',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'attendance.session_created' },
  onSessionCreatedLogic
);

// ============================================================================
// onCheckIn Handler
// Triggered when: attendance.check_in event is emitted
// Action: Add points to user and notify with leaderboard rank
// ============================================================================
const onCheckInLogic = async ({ event, step }) => {
  const { session_id, team_id, user_id, checked_in_at } = event.data;

  logger.info('Processing attendance.check_in event', {
    session_id,
    team_id,
    user_id,
    checked_in_at
  });

  // Step 1: Fetch session details
  const session = await step.run('fetch-session', async () => {
    return db('attendance_sessions')
      .where('id', session_id)
      .where('team_id', team_id)
      .first();
  });

  if (!session) {
    logger.warn('Session not found for check-in', { session_id, team_id });
    throw new Error(`Session ${session_id} not found`);
  }

  // Step 2: Fetch user details
  const user = await step.run('fetch-user', async () => {
    return getTeamUser(user_id, team_id);
  });

  if (!user) {
    logger.warn('User not found for check-in', { user_id, team_id });
    throw new Error(`User ${user_id} not found`);
  }

  // Step 3: Add points for attendance
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  await step.run('add-points', async () => {
    return gamificationService.addPoints(user_id, 10, 'attendance', team_id);
  });

  logger.info('Points added for check-in', {
    user_id,
    team_id,
    points: 10
  });

  // Step 4: Get leaderboard to find user's rank
  const leaderboard = await step.run('fetch-leaderboard', async () => {
    return gamificationService.getLeaderboard(team_id, currentMonth);
  });

  const userRank = leaderboard.find(entry => entry.id === user_id)?.rank || 'N/A';

  logger.info('User rank determined', {
    user_id,
    rank: userRank
  });

  // Step 5: Send notification to user
  await step.run('send-notification', async () => {
    try {
      await notificationService.sendZaloMessage(
        user.zalo_user_id,
        'CHECK_IN_SUCCESS',
        {
          points_earned: '10',
          current_rank: userRank.toString(),
          session_type: session.session_type === 'training' ? 'Training' : 'Match'
        }
      );
      logger.info('Check-in success notification sent', {
        user_id,
        team_id,
        session_id
      });
    } catch (error) {
      logger.error('Failed to send check-in notification', {
        user_id,
        team_id,
        session_id,
        error: error.message
      });
      // Don't throw - notification failure shouldn't prevent points from being added
    }
  });

  // Step 6: Log the action
  await step.run('log-action', async () => {
    logger.info('Check-in processing completed', {
      session_id,
      team_id,
      user_id,
      points_added: 10,
      rank: userRank
    });
  });

  return {
    status: 'completed',
    session_id,
    user_id,
    points_added: 10,
    rank: userRank
  };
};

const onCheckInHandler = inngest.createFunction(
  {
    id: 'attendance.check_in',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'attendance.check_in' },
  onCheckInLogic
);

// ============================================================================
// onSessionClosed Handler
// Triggered when: attendance.session_closed event is emitted
// Action: Mark absent members who didn't check in, add penalties, send notifications
// ============================================================================
const onSessionClosedLogic = async ({ event, step }) => {
  const { session_id, team_id, closed_by } = event.data;

  logger.info('Processing attendance.session_closed event', {
    session_id,
    team_id,
    closed_by
  });

  // Step 1: Fetch session details
  const session = await step.run('fetch-session', async () => {
    return db('attendance_sessions')
      .where('id', session_id)
      .where('team_id', team_id)
      .first();
  });

  if (!session) {
    logger.warn('Session not found for closure', { session_id, team_id });
    throw new Error(`Session ${session_id} not found`);
  }

  // Step 2: Fetch all active team members
  const teamMembers = await step.run('fetch-team-members', async () => {
    return getTeamUsers(team_id, { status: 'active' });
  });

  logger.info('Found team members for session closure', {
    team_id,
    count: teamMembers.length
  });

  // Step 3: Fetch attendance records for this session
  const attendanceRecords = await step.run('fetch-attendance-records', async () => {
    return db('attendance_records')
      .where('session_id', session_id)
      .select('user_id', 'status');
  });

  const attendedUserIds = new Set(
    attendanceRecords
      .filter(record => record.status === 'attended')
      .map(record => record.user_id)
  );

  logger.info('Found attended members', {
    session_id,
    attended_count: attendedUserIds.size
  });

  // Step 4: Mark absent and add penalties for members who didn't attend
  let absentCount = 0;
  let penaltyCount = 0;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  for (const member of teamMembers) {
    if (!attendedUserIds.has(member.id)) {
      // Mark as absent
      await step.run(`mark-absent-${member.id}`, async () => {
        return db('attendance_records').insert({
          session_id,
          user_id: member.id,
          status: 'marked_absent',
          marked_by: closed_by,
          created_at: db.fn.now()
        }).onConflict('session_id', 'user_id').merge();
      });

      absentCount++;

      // Add penalty points
      await step.run(`add-penalty-${member.id}`, async () => {
        return gamificationService.addPoints(member.id, -5, 'absence_penalty', team_id);
      });

      penaltyCount++;

      logger.info('Member marked absent with penalty', {
        user_id: member.id,
        session_id,
        team_id
      });
    }
  }

  // Step 5: Calculate session statistics
  const sessionStats = {
    attended_count: attendedUserIds.size,
    absent_count: absentCount,
    penalty_points_applied: penaltyCount * 5,
    total_members: teamMembers.length
  };

  logger.info('Session statistics calculated', {
    session_id,
    stats: sessionStats
  });

  // Step 6: Send notifications to all team members with session summary
  let notificationsSent = 0;
  let notificationsFailed = 0;

  for (const member of teamMembers) {
    await step.run(`send-summary-to-${member.id}`, async () => {
      try {
        await notificationService.sendZaloMessage(
          member.zalo_user_id,
          'SESSION_CLOSED_SUMMARY',
          {
            session_type: session.session_type === 'training' ? 'Training' : 'Match',
            attended_count: sessionStats.attended_count.toString(),
            absent_count: sessionStats.absent_count.toString(),
            total_members: sessionStats.total_members.toString(),
            user_status: attendedUserIds.has(member.id) ? 'attended' : 'absent'
          }
        );
        notificationsSent++;
        logger.info('Session closed summary notification sent', {
          member_id: member.id,
          team_id,
          session_id
        });
      } catch (error) {
        notificationsFailed++;
        logger.error('Failed to send session closed summary notification', {
          member_id: member.id,
          team_id,
          session_id,
          error: error.message
        });
        // Continue with next member on error
      }
    });
  }

  // Step 7: Log the action
  await step.run('log-action', async () => {
    logger.info('Session closure processing completed', {
      session_id,
      team_id,
      sessionStats,
      notificationsSent,
      notificationsFailed
    });
  });

  return {
    status: 'completed',
    session_id,
    statistics: sessionStats,
    notificationsSent,
    notificationsFailed
  };
};

const onSessionClosedHandler = inngest.createFunction(
  {
    id: 'attendance.session_closed',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'attendance.session_closed' },
  onSessionClosedLogic
);

// Export handlers and logic for testing
module.exports = {
  onSessionCreatedHandler,
  onCheckInHandler,
  onSessionClosedHandler,
  logic: {
    onSessionCreated: onSessionCreatedLogic,
    onCheckIn: onCheckInLogic,
    onSessionClosed: onSessionClosedLogic
  }
};
