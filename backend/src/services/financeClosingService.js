/**
 * Finance Closing Period Service
 * Handles notifications and status checks for finance closing periods
 */
const db = require('../config/database');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Check if today is the first day of closing period and send notification
 */
async function checkAndNotifyFirstDay() {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Find teams with closing period starting today
        const teams = await db('teams')
            .where('finance_closing_from_date', today)
            .where('finance_closing_notified', false)
            .whereNotNull('finance_closing_from_date')
            .whereNotNull('finance_closing_to_date');

        logger.info(`Found ${teams.length} teams with closing period starting today`);

        for (const team of teams) {
            try {
                // Get all team members
                const members = await db('team_members')
                    .where({ team_id: team.id, status: 'active' })
                    .select('user_id');

                if (members.length === 0) {
                    logger.warn(`No active members in team ${team.id} for finance closing notification`);
                    continue;
                }

                const toDate = new Date(team.finance_closing_to_date).toLocaleDateString('vi-VN');
                const notification = {
                    team_id: team.id,
                    type: 'finance_closing_started',
                    title: 'Kỳ đóng quỹ bắt đầu',
                    message: `Kỳ đóng quỹ từ hôm nay đến ${toDate}. Vui lòng hoàn thành ghi chép tài chính.`,
                    data: {
                        closing_from_date: team.finance_closing_from_date,
                        closing_to_date: team.finance_closing_to_date,
                    },
                };

                // Broadcast to all members
                await notificationService.broadcastNotification(notification);

                // Mark as notified
                await db('teams')
                    .where({ id: team.id })
                    .update({ finance_closing_notified: true });

                logger.info(`Finance closing notification sent to team ${team.id}`);
            } catch (error) {
                logger.error(`Error processing team ${team.id} for finance closing notification:`, error);
            }
        }
    } catch (error) {
        logger.error('Error in checkAndNotifyFirstDay:', error);
        throw error;
    }
}

/**
 * Reset notification flag for teams with expired closing periods
 */
async function resetExpiredClosingNotifications() {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Find teams whose closing period has ended
        const teams = await db('teams')
            .where('finance_closing_to_date', '<', today)
            .where('finance_closing_notified', true)
            .whereNotNull('finance_closing_to_date');

        if (teams.length > 0) {
            await db('teams')
                .whereIn('id', teams.map(t => t.id))
                .update({ finance_closing_notified: false });

            logger.info(`Reset notification flag for ${teams.length} expired closing periods`);
        }
    } catch (error) {
        logger.error('Error in resetExpiredClosingNotifications:', error);
        throw error;
    }
}

/**
 * Get active closing period for a team (if any)
 */
async function getActiveClosingPeriod(teamId) {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const team = await db('teams')
            .where({ id: teamId })
            .select('finance_closing_from_date', 'finance_closing_to_date')
            .first();

        if (!team || !team.finance_closing_from_date || !team.finance_closing_to_date) {
            return null;
        }

        if (today >= team.finance_closing_from_date && today <= team.finance_closing_to_date) {
            return {
                from_date: team.finance_closing_from_date,
                to_date: team.finance_closing_to_date,
                is_active: true,
                days_remaining: calculateDaysRemaining(team.finance_closing_to_date),
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in getActiveClosingPeriod:', error);
        throw error;
    }
}

/**
 * Calculate days remaining until end date
 */
function calculateDaysRemaining(toDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(toDate);
    endDate.setHours(0, 0, 0, 0);

    const timeRemaining = endDate - today;
    const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

    return Math.max(0, daysRemaining);
}

module.exports = {
    checkAndNotifyFirstDay,
    resetExpiredClosingNotifications,
    getActiveClosingPeriod,
    calculateDaysRemaining,
};
