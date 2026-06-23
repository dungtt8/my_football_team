/**
 * Service for automatically creating attendance sessions based on team schedule
 * Called periodically (e.g., daily via cron or Inngest)
 */
const db = require('../config/database');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const { ValidationError, NotFoundError } = require('./errorService');

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Check if current UTC time matches team's configured auto-session creation time
 * Allows 1-hour window (matches if within the hour)
 */
function isTimeWindowActive(configuredTime) {
    if (!configuredTime) return true; // If no time set, always active

    try {
        const [configHour, configMinute] = configuredTime.split(':').map(Number);
        const now = new Date();
        const currentHour = now.getUTCHours();

        // Active during the configured hour
        return currentHour === configHour;
    } catch (error) {
        logger.warn('Invalid auto_session_creation_time format:', configuredTime);
        return true; // Default to active if parsing fails
    }
}

/**
 * Check if a session should be auto-created for a team today
 * Returns true if:
 * - auto_create_sessions is enabled
 * - frequency matches today (daily, or weekly on matching day)
 * - current time is within the configured creation time window
 * - session hasn't been created today yet
 */
const shouldCreateSession = (team) => {
    if (!team.auto_create_sessions || team.session_frequency === 'disabled') {
        return false;
    }

    // Check if current time matches configured auto-session creation time
    if (!isTimeWindowActive(team.auto_session_creation_time || '03:00')) {
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

    // Check frequency
    if (team.session_frequency === 'daily') {
        return true;
    }

    if (team.session_frequency === 'weekly' && team.session_days) {
        const today = new Date();
        const dayName = DAYS_OF_WEEK[today.getDay()];
        const sessionDays = team.session_days.split(',').map(d => d.trim().toLowerCase());
        return sessionDays.includes(dayName);
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

        // Parse session time
        const [hours, minutes] = team.session_time.split(':').map(Number);
        const checkInDeadline = new Date();
        checkInDeadline.setHours(hours, minutes, 0, 0);

        // Add attendance cooldown to create deadline earlier
        const cooldownMinutes = team.attendance_cooldown_minutes || 5;
        checkInDeadline.setMinutes(checkInDeadline.getMinutes() - cooldownMinutes);

        // Create session
        const [session] = await db('attendance_sessions').insert({
            team_id: teamId,
            session_date: new Date(),
            session_type: team.session_type === 'both' ? 'training' : team.session_type,
            location: team.session_location || null,
            check_in_deadline: checkInDeadline,
            status: 'active',
            created_by: null, // System created
            created_at: new Date(),
        }).returning('*');

        // Update team's last_auto_session_created_at
        await db('teams').where({ id: teamId }).update({
            last_auto_session_created_at: new Date(),
        });

        logger.info('Auto-created attendance session', {
            team_id: teamId,
            session_id: session.id,
            session_type: session.session_type,
        });

        // Broadcast notification to all team members
        try {
            const sessionTypeLabel = session.session_type === 'training' ? 'tập luyện' : 'thi đấu';
            const sessionDate = new Date(session.session_date).toLocaleString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            await notificationService.broadcastNotification(teamId, {
                type: 'session_created_auto',
                title: `Có buổi ${sessionTypeLabel} mới`,
                message: `Lịch ${sessionTypeLabel} được tạo tự động vào lúc ${sessionDate}`,
                data: {
                    session_id: session.id,
                    session_date: session.session_date.toISOString(),
                    session_type: session.session_type,
                    deadline: session.check_in_deadline ? session.check_in_deadline.toISOString() : null
                }
            });
        } catch (notifError) {
            logger.warn('Failed to broadcast notification for auto-created session', {
                session_id: session.id,
                error: notifError.message
            });
            // Don't fail the session creation if notification broadcast fails
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
