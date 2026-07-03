/**
 * Service for automatically creating attendance sessions based on team schedule
 * Called periodically (e.g., daily via cron or Inngest)
 */
const db = require('../config/database');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const checkinService = require('./checkinService');
const { ValidationError, NotFoundError } = require('./errorService');

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Check if current UTC time matches the team's checkin_creation_time (stored in UTC).
 * Session creation reuses the same time window as the check-in notification
 * ("Giờ gửi thông báo"), so both fire together.
 * Allows 1-hour window (matches if within the same hour).
 */
function isTimeWindowActive(configuredUtcTime) {
    if (!configuredUtcTime) return true;

    try {
        const [configHour] = configuredUtcTime.split(':').map(Number);
        const currentHour = new Date().getUTCHours();
        return currentHour === configHour;
    } catch (error) {
        logger.warn('Invalid checkin_creation_time format:', configuredUtcTime);
        return true;
    }
}

/**
 * Check if a session should be auto-created for a team today
 * Returns true if:
 * - auto_create_sessions is enabled
 * - frequency matches today (daily, or weekly on one of the configured session_days)
 * - current time is within the notification time window (checkin_creation_time)
 * - session hasn't been created today yet
 */
const shouldCreateSession = (team) => {
    if (!team.auto_create_sessions || team.session_frequency === 'disabled') {
        return false;
    }

    // Fire at the same time as the check-in notification ("Giờ gửi thông báo")
    if (!isTimeWindowActive(team.checkin_creation_time || '13:00')) {
        return false;
    }

    // Check if session was already created today
    if (team.last_auto_session_created_at) {
        const lastCreated = new Date(team.last_auto_session_created_at);
        const today = new Date();
        const lastCreatedDate = new Date(lastCreated.getFullYear(), lastCreated.getMonth(), lastCreated.getDate());
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (lastCreatedDate.getTime() === todayDate.getTime()) {
            return false; // Already created today
        }
    }

    const todayName = DAYS_OF_WEEK[new Date().getDay()];

    // Check frequency
    if (team.session_frequency === 'daily') {
        return true;
    }

    if (team.session_frequency === 'weekly') {
        // Today must be one of the days selected in "Các ngày diễn ra trong tuần"
        const days = (team.session_days || '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        return days.includes(todayName);
    }

    return false;
};

/**
 * Auto-create an attendance session for a team
 * Called if shouldCreateSession returns true
 */
const createAutoSession = async (teamId) => {
    try {
        const team = await db('teams').where({ id: teamId }).first();
        if (!team) {
            throw new NotFoundError(`Team ${teamId} not found`);
        }

        if (!shouldCreateSession(team)) {
            return null; // Don't create
        }

        // session_date = today at configured session_time (session_time is GMT+7, convert to UTC)
        const [hours, minutes] = (team.session_time || '18:00').split(':').map(Number);
        const sessionDate = new Date();
        // GMT+7 offset = -7 hours from UTC perspective
        sessionDate.setUTCHours(hours - 7, minutes, 0, 0);

        // check_in_deadline = checkin_creation_time (UTC), since that's when members are notified
        const [dlHour, dlMin] = (team.checkin_creation_time || '13:00').split(':').map(Number);
        const checkInDeadline = new Date();
        checkInDeadline.setUTCHours(dlHour, dlMin, 0, 0);

        // Create session
        const [session] = await db('attendance_sessions').insert({
            team_id: teamId,
            session_date: sessionDate,
            session_type: team.session_type === 'both' ? 'training' : team.session_type,
            location: team.session_location || null,
            check_in_deadline: checkInDeadline,
            status: 'active',
            created_by: null,
            created_at: new Date(),
            updated_at: new Date(),
        }).returning('*');

        // Auto-create checkin rows for all active members
        await checkinService.createCheckinsForSession(session.id, teamId);

        // Update team's last_auto_session_created_at
        await db('teams').where({ id: teamId }).update({
            last_auto_session_created_at: new Date(),
        });

        logger.info('Auto-created attendance session', {
            team_id: teamId,
            session_id: session.id,
            session_type: session.session_type,
        });

        // Emit event — same as manual creation flow
        try {
            await notificationService.emitEvent('attendance.session_created', {
                session_id: session.id,
                team_id: teamId,
                session_date: session.session_date,
                session_type: session.session_type,
                created_by: null, // auto-created
            });
        } catch (notifError) {
            logger.warn('Failed to emit event for auto-created session', {
                session_id: session.id,
                error: notifError.message,
            });
        }

        return session;
    } catch (error) {
        logger.error('Error auto-creating session', {
            team_id: teamId,
            error: error.message,
        });
        throw error;
    }
};

/**
 * Process all teams and create sessions where needed
 * Run this daily (e.g., via cron or Inngest scheduled job)
 */
const processAutoSessions = async () => {
    try {
        logger.info('Starting auto-session processing');

        // Get all active teams with auto-creation enabled
        const teams = await db('teams')
            .where({ auto_create_sessions: true })
            .whereNot({ session_frequency: 'disabled' })
            .whereNull('deleted_at');

        logger.info(`Found ${teams.length} teams with auto-session enabled`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const team of teams) {
            try {
                if (shouldCreateSession(team)) {
                    await createAutoSession(team.id);
                    createdCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                logger.error(`Error processing team ${team.id}:`, error.message);
            }
        }

        logger.info('Auto-session processing complete', {
            created: createdCount,
            skipped: skippedCount,
        });

        return { created: createdCount, skipped: skippedCount };
    } catch (error) {
        logger.error('Error in processAutoSessions', error);
        throw error;
    }
};

/**
 * Update session scheduling settings for a team
 * Called from team settings endpoint
 */
const updateSessionSchedule = async (teamId, settings) => {
    const updates = {};

    if (settings.hasOwnProperty('auto_create_sessions')) {
        updates.auto_create_sessions = Boolean(settings.auto_create_sessions);
    }

    if (settings.frequency) {
        if (!['disabled', 'daily', 'weekly', 'custom'].includes(settings.frequency)) {
            throw new ValidationError('Invalid session frequency');
        }
        updates.session_frequency = settings.frequency;
    }

    if (settings.session_days !== undefined && settings.frequency === 'weekly') {
        // Validate day names
        const days = settings.session_days.split(',').map(d => d.trim().toLowerCase());
        const validDays = days.every(d => DAYS_OF_WEEK.includes(d));
        if (!validDays) {
            throw new ValidationError('Invalid day names. Use: sun, mon, tue, wed, thu, fri, sat');
        }
        updates.session_days = settings.session_days;
    }

    if (settings.session_time) {
        const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(settings.session_time)) {
            throw new ValidationError('Invalid session time format. Use HH:mm');
        }
        updates.session_time = settings.session_time;
    }

    if (settings.session_type) {
        if (!['training', 'match', 'both'].includes(settings.session_type)) {
            throw new ValidationError('Invalid session type');
        }
        updates.session_type = settings.session_type;
    }

    if (settings.session_location !== undefined) {
        updates.session_location = settings.session_location || null;
    }

    if (Object.keys(updates).length === 0) {
        return null; // No changes
    }

    await db('teams').where({ id: teamId }).update(updates);

    logger.info('Session schedule updated', {
        team_id: teamId,
        updates: Object.keys(updates),
    });

    return updates;
};

module.exports = {
    shouldCreateSession,
    createAutoSession,
    processAutoSessions,
    updateSessionSchedule,
};
