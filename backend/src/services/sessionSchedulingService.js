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
 * Smallest non-negative number of days to add to `fromIdx` (0=sun..6=sat)
 * to land on `toIdx`. Returns 0 if they're the same day.
 */
function daysUntil(fromIdx, toIdx) {
    return (toIdx - fromIdx + 7) % 7;
}

/**
 * Build a UTC Date for `daysFromToday` days from now, at `hours:minutes`
 * expressed in GMT+7 wall-clock time. Used for `session_time`, which is
 * entered by the user as GMT+7 in the "Thông tin sự kiện" UI section.
 */
function gmt7DateAt(daysFromToday, hours, minutes) {
    const now = new Date();
    const gmt7Target = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday,
        hours, minutes, 0, 0
    ));
    return new Date(gmt7Target.getTime() - 7 * 60 * 60 * 1000);
}

/**
 * Build a UTC Date for `daysFromToday` days from now, at `hours:minutes`
 * already expressed in UTC. Used for `checkin_creation_time`, which is
 * stored in UTC (see migration 005_teams_checkin_schedule.js).
 */
function utcDateAt(daysFromToday, hours, minutes) {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday));
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
}

/**
 * Check if a session should be auto-created for a team today.
 *
 * Creation is gated entirely by "Thông báo & Thời hạn điểm danh"
 * (checkin_creation_day / checkin_creation_time) — NOT by "Thông tin sự kiện"
 * (session_days). session_days/session_time only describe when the match or
 * training itself happens; they don't control when the system should create
 * the attendance request asking members to confirm.
 *
 * Returns true if:
 * - auto_create_sessions is enabled
 * - current time is within the notification time window (checkin_creation_time)
 * - for weekly frequency: today matches checkin_creation_day
 * - for daily frequency: fires every day (still gated by the time window)
 * - session hasn't been created today yet
 */
const shouldCreateSession = (team) => {
    if (!team.auto_create_sessions || team.session_frequency === 'disabled') {
        return false;
    }

    // Fire at the configured notification time ("Giờ gửi thông báo")
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

    if (team.session_frequency === 'daily') {
        return true;
    }

    if (team.session_frequency === 'weekly') {
        // Today must be the configured notification day ("Ngày gửi thông báo"),
        // not one of the event's session_days.
        const todayName = DAYS_OF_WEEK[new Date().getUTCDay()];
        return (team.checkin_creation_day || 'mon').toLowerCase() === todayName;
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

        const todayIdx = new Date().getUTCDay();

        // ---- Event date/time ("Thông tin sự kiện") ----
        // The match/training can happen on a different day than today (the
        // notification/creation day). Find the nearest upcoming occurrence of
        // one of the configured session_days (or today, for daily frequency)
        // and build its date at session_time (GMT+7 wall-clock, per the UI).
        const [sessHours, sessMinutes] = (team.session_time || '18:00').split(':').map(Number);

        let eventDayOffset = 0;
        if (team.session_frequency === 'weekly') {
            const eventDayIdxs = (team.session_days || '')
                .split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
                .map(d => DAYS_OF_WEEK.indexOf(d))
                .filter(idx => idx >= 0);

            if (eventDayIdxs.length > 0) {
                eventDayOffset = Math.min(...eventDayIdxs.map(idx => daysUntil(todayIdx, idx)));
            }
        }
        const sessionDate = gmt7DateAt(eventDayOffset, sessHours, sessMinutes);

        // ---- Check-in deadline ("Thời hạn điểm danh") ----
        // The deadline day is checkin_end_day (from the same "Thông báo & Thời
        // hạn điểm danh" section as the creation trigger) — not the event's day —
        // at the dedicated checkin_deadline_time (UTC), configured independently
        // from the notification time. Falls back to checkin_creation_time for
        // teams that haven't set a distinct deadline time.
        const [dlHour, dlMin] = (team.checkin_deadline_time || team.checkin_creation_time || '13:00').split(':').map(Number);
        const endDayIdx = DAYS_OF_WEEK.indexOf((team.checkin_end_day || 'tue').toLowerCase());
        const deadlineOffset = endDayIdx >= 0 ? daysUntil(todayIdx, endDayIdx) : 0;
        let checkInDeadline = utcDateAt(deadlineOffset, dlHour, dlMin);

        // Safety clamp: checkin_end_day is configured independently from
        // session_days, so a mismatched config (e.g. end_day set later in the
        // week than the actual match day) could otherwise produce a deadline
        // AFTER the event itself — letting members "confirm" a match that
        // already happened. Never let the deadline be later than the event.
        if (checkInDeadline > sessionDate) {
            checkInDeadline = sessionDate;
        }

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
    DAYS_OF_WEEK,
    daysUntil,
    shouldCreateSession,
    createAutoSession,
    processAutoSessions,
    updateSessionSchedule,
};
