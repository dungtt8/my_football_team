/**
 * Migration 013: Add check-in settings to teams table
 * 
 * Adds fields for configuring when check-in notifications are created
 * and during which period members can check-in (respond Có/Không)
 */

exports.up = function (knex) {
    return knex.schema.table('teams', function (table) {
        // Day of week to create check-in notification (mon-sun)
        table.string('checkin_creation_day', 10).defaultTo('mon').comment('Day of week to create check-in notification');

        // Time to create check-in notification (HH:mm UTC format)
        table.string('checkin_creation_time', 5).defaultTo('20:00').comment('Time to create check-in notification (HH:mm UTC)');

        // Check-in period start day (mon-sun)
        table.string('checkin_start_day', 10).defaultTo('fri').comment('Day when check-in period starts');

        // Check-in period end day (mon-sun)
        table.string('checkin_end_day', 10).defaultTo('tue').comment('Day when check-in period ends');

        // Month string to track if notification already sent this week (YYYY-MM-WW)
        table.string('checkin_notified_week', 10).comment('Track which week check-in notification was sent (YYYY-WW)');
    });
};

exports.down = function (knex) {
    return knex.schema.table('teams', function (table) {
        table.dropColumn('checkin_creation_day');
        table.dropColumn('checkin_creation_time');
        table.dropColumn('checkin_start_day');
        table.dropColumn('checkin_end_day');
        table.dropColumn('checkin_notified_week');
    });
};
