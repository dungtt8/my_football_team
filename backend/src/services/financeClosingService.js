/**
 * Finance Payment Deadline Service
 * Handles notifications and status checks for monthly payment deadlines
 */
const db = require('../config/database');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonthString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Whether `day` falls within [startDay, endDay] (both day-of-month, 1-31).
 * Handles ranges that wrap around the end of the month, e.g. startDay=25,
 * endDay=5 means "the 25th through the 5th of the following month".
 */
function isDayInRange(day, startDay, endDay) {
    if (!startDay || !endDay) return false;
    if (startDay <= endDay) {
        return day >= startDay && day <= endDay;
    }
    return day >= startDay || day <= endDay;
}

/**
 * Check if today is the first day of payment deadline and send notification
 */
async function checkAndNotifyPaymentDeadline() {
    try {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = getCurrentMonthString();

        // Find teams where payment deadline starts today
        const teams = await db('teams')
            .where('finance_payment_start_day', currentDay)
            .whereNotNull('finance_payment_start_day')
            .whereNotNull('finance_payment_end_day')
            .whereNull('deleted_at');

        logger.info(`Found ${teams.length} teams with payment deadline starting today (day ${currentDay})`);

        for (const team of teams) {
            try {
                // Check if already notified this month
                if (team.finance_payment_notified_month === currentMonth) {
                    logger.info(`Team ${team.id} already notified for ${currentMonth}, skipping`);
                    continue;
                }

                // Get all team members
                const members = await db('team_members')
                    .where({ team_id: team.id, status: 'active' })
                    .select('user_id');

                if (members.length === 0) {
                    logger.warn(`No active members in team ${team.id} for payment deadline notification`);
                    continue;
                }

                const endDay = team.finance_payment_end_day;
                const notification = {
                    team_id: team.id,
                    type: 'finance_payment_deadline',
                    title: 'Thời hạn thanh toán quỹ',
                    message: `Vui lòng thanh toán quỹ tháng này trong khoảng ngày ${currentDay}-${endDay}.`,
                    data: {
                        payment_start_day: team.finance_payment_start_day,
                        payment_end_day: team.finance_payment_end_day,
                        current_month: currentMonth,
                    },
                };

                // Broadcast to all members
                await notificationService.broadcastNotification(notification);

                // Mark as notified for this month
                await db('teams')
                    .where({ id: team.id })
                    .update({ finance_payment_notified_month: currentMonth });

                logger.info(`Payment deadline notification sent to team ${team.id} for ${currentMonth}`);
            } catch (error) {
                logger.error(`Error processing team ${team.id} for payment deadline notification:`, error);
            }
        }
    } catch (error) {
        logger.error('Error in checkAndNotifyPaymentDeadline:', error);
        throw error;
    }
}

/**
 * Get active payment deadline for a team (if any)
 */
async function getActivePaymentDeadline(teamId) {
    try {
        const today = new Date();
        const currentDay = today.getDate();

        const team = await db('teams')
            .where({ id: teamId })
            .select('finance_payment_start_day', 'finance_payment_end_day')
            .first();

        if (!team || !team.finance_payment_start_day || !team.finance_payment_end_day) {
            return null;
        }

        const isActive = isDayInRange(currentDay, team.finance_payment_start_day, team.finance_payment_end_day);

        if (isActive) {
            return {
                start_day: team.finance_payment_start_day,
                end_day: team.finance_payment_end_day,
                is_active: true,
                days_remaining: calculateDaysRemaining(team.finance_payment_end_day, team.finance_payment_start_day),
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in getActivePaymentDeadline:', error);
        throw error;
    }
}

/**
 * Calculate days remaining until endDay. If startDay is given and the range
 * wraps around month-end (startDay > endDay), endDay is treated as falling
 * in the following month when the current day hasn't wrapped yet.
 */
function calculateDaysRemaining(endDay, startDay = null) {
    const today = new Date();
    const currentDay = today.getDate();
    const wraps = startDay != null && startDay > endDay;

    if (!wraps) {
        if (currentDay > endDay) {
            return 0; // Payment deadline has passed
        }
        return endDay - currentDay;
    }

    // Wrapping range, e.g. 25 -> 5. If we're still in the "start" month
    // portion (currentDay >= startDay), endDay is next month.
    if (currentDay >= startDay) {
        const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        return (daysInCurrentMonth - currentDay) + endDay;
    }
    // Otherwise we're already past the month boundary, in the "end" portion.
    if (currentDay > endDay) {
        return 0; // Shouldn't normally happen if isDayInRange gated this call
    }
    return endDay - currentDay;
}

module.exports = {
    checkAndNotifyPaymentDeadline,
    getActivePaymentDeadline,
    calculateDaysRemaining,
    isDayInRange,
};
