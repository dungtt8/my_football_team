const db = require('../config/database');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Get current week string in YYYY-WW format
 */
function getCurrentWeekString() {
    const now = new Date();
    const year = now.getUTCFullYear();

    // ISO week calculation
    const date = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

    return `${year}-${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get day name (0-6, where 0=Sunday)
 */
function getTodayDayName() {
    const today = new Date();
    return DAYS_OF_WEEK[today.getUTCDay()];
}

/**
 * Check if current time matches configured check-in creation time
 */
function isCheckInCreationTime(configuredTime) {
    if (!configuredTime) return false;

    try {
        const [configHour, configMinute] = configuredTime.split(':').map(Number);
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();

        // Active during the configured hour and minute window (10 min tolerance)
        return currentHour === configHour && Math.abs(currentMinute - configMinute) < 10;
    } catch (error) {
        logger.warn('Invalid checkin_creation_time format:', configuredTime);
        return false;
    }
}

/**
 * Get next session date from a given start day
 * For example: if today is Monday and start_day is Friday,
 * return the upcoming Friday
 */
function getNextSessionDate(sessionDayIndex) {
    const today = new Date();
    const todayIndex = today.getUTCDay();

    let daysToAdd = sessionDayIndex - todayIndex;
    if (daysToAdd <= 0) {
        daysToAdd += 7; // Next week
    }

    const nextDate = new Date(today);
    nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd);

    return nextDate;
}

/**
 * Get day index from day name (mon, tue, etc.)
 */
function getDayIndex(dayName) {
    return DAYS_OF_WEEK.indexOf(dayName.toLowerCase());
}

/**
 * Check if today is within check-in period
 * Returns true if check-in can still be done today
 */
function isInCheckInPeriod(startDayName, endDayName) {
    const todayIndex = new Date().getUTCDay();
    const startIndex = getDayIndex(startDayName);
    const endIndex = getDayIndex(endDayName);

    if (startIndex <= endIndex) {
        // Period doesn't wrap (e.g., Mon-Wed)
        return todayIndex >= startIndex && todayIndex <= endIndex;
    } else {
        // Period wraps (e.g., Fri-Mon)
        return todayIndex >= startIndex || todayIndex <= endIndex;
    }
}

/**
 * Create check-in notifications for upcoming session
 * Should be called from Inngest cron job
 * Runs daily, creates check-in when:
 * - Today is checkin_creation_day
 * - Current time matches checkin_creation_time
 * - Haven't created for this week yet
 */
const checkAndCreateCheckInNotifications = async () => {
    try {
        const todayName = getTodayDayName();
        const currentWeek = getCurrentWeekString();

        // Find all teams that should create check-in today
        const teams = await db('teams')
            .where('session_frequency', '!=', 'disabled')
            .where('auto_create_sessions', true);

        for (const team of teams) {
            // Check if today is check-in creation day
            if (team.checkin_creation_day !== todayName) {
                continue;
            }

            // Check if we already created check-in this week
            if (team.checkin_notified_week === currentWeek) {
                logger.info(`Check-in already created this week for team ${team.id}`);
                continue;
            }

            // Check if current time matches
            if (!isCheckInCreationTime(team.checkin_creation_time)) {
                logger.debug(`Not yet time for check-in creation. Expected: ${team.checkin_creation_time}`);
                continue;
            }

            // Find the session day (when the actual event happens)
            const sessionDayIndex = getDayIndex(team.session_days || 'mon');
            const sessionDate = getNextSessionDate(sessionDayIndex);

            // Get or find the session for this date
            // For now, we assume session is created for this date
            const session = await db('attendance_sessions')
                .where('team_id', team.id)
                .where(db.raw(`DATE(session_date AT TIME ZONE 'UTC') = ?`, [
                    sessionDate.toISOString().split('T')[0]
                ]))
                .first();

            if (!session) {
                logger.warn(`No session found for team ${team.id} on ${sessionDate.toISOString()}`);
                continue;
            }

            // Get all active team members
            const members = await db('team_members')
                .where('team_id', team.id)
                .where('status', 'active')
                .whereNull('deleted_at');

            // Create check-in record for each member
            const checkInData = members.map(member => ({
                team_id: team.id,
                member_id: member.id,
                session_id: session.id,
                response: null,
                created_at: new Date(),
                updated_at: new Date(),
            }));

            await db('attendance_checkins').insert(checkInData);

            // Update team's last notification week
            await db('teams').where('id', team.id).update({
                checkin_notified_week: currentWeek,
            });

            // Send notification to all members
            const sessionDateTime = new Date(session.session_date).toLocaleString('vi-VN');
            await notificationService.broadcastNotification(
                team.id,
                `Điểm danh cho sự kiện ${session.session_type} - ${sessionDateTime}`,
                `Vui lòng báo sẽ tham gia hay không tham gia sự kiện tại ${session.location}`
            );

            logger.info(`Check-in notifications created for team ${team.id}, session ${session.id}`);
        }
    } catch (error) {
        logger.error('Error creating check-in notifications:', error);
        throw error;
    }
};

/**
 * Get active check-in for current period
 * Returns the check-in record if in check-in period, null otherwise
 */
const getActiveCheckIn = async (teamId, memberId) => {
    try {
        const team = await db('teams').where('id', teamId).first();
        if (!team) throw new Error('Team not found');

        // Check if we're in check-in period
        if (!isInCheckInPeriod(team.checkin_start_day, team.checkin_end_day)) {
            return null; // Not in check-in period
        }

        // Get the most recent check-in that hasn't been responded to
        const checkIn = await db('attendance_checkins')
            .join('attendance_sessions', 'attendance_checkins.session_id', '=', 'attendance_sessions.id')
            .where('attendance_checkins.team_id', teamId)
            .where('attendance_checkins.member_id', memberId)
            .where('attendance_sessions.session_date', '>=', db.raw('NOW()'))
            .orderBy('attendance_sessions.session_date', 'asc')
            .select('attendance_checkins.*', 'attendance_sessions.session_date as session_time', 'attendance_sessions.location as session_location', 'attendance_sessions.session_type')
            .first();

        return checkIn || null;
    } catch (error) {
        logger.error('Error getting active check-in:', error);
        throw error;
    }
};

/**
 * Member responds to check-in (yes/no)
 */
const respondToCheckIn = async (checkInId, response) => {
    try {
        if (!['yes', 'no'].includes(response)) {
            throw new Error('Invalid response. Must be "yes" or "no"');
        }

        const updated = await db('attendance_checkins')
            .where('id', checkInId)
            .update({
                response,
                responded_at: new Date(),
                updated_at: new Date(),
            });

        if (updated === 0) {
            throw new Error('Check-in not found');
        }

        logger.info(`Check-in ${checkInId} updated with response: ${response}`);
        return { id: checkInId, response, responded_at: new Date() };
    } catch (error) {
        logger.error('Error responding to check-in:', error);
        throw error;
    }
};

/**
 * Get check-in stats for a session
 */
const getCheckInStats = async (sessionId) => {
    try {
        const stats = await db('attendance_checkins')
            .where('session_id', sessionId)
            .select('response')
            .count('* as count')
            .groupBy('response');

        const result = {
            yes: 0,
            no: 0,
            pending: 0,
        };

        for (const stat of stats) {
            if (stat.response === 'yes') result.yes = stat.count;
            else if (stat.response === 'no') result.no = stat.count;
            else result.pending = stat.count;
        }

        return result;
    } catch (error) {
        logger.error('Error getting check-in stats:', error);
        throw error;
    }
};

module.exports = {
    checkAndCreateCheckInNotifications,
    getActiveCheckIn,
    respondToCheckIn,
    getCheckInStats,
    isInCheckInPeriod,
    getCurrentWeekString,
};
