/**
 * Migration 013: Add check-in settings to teams table
 * 
 * Adds fields for configuring when check-in notifications are created
 * and during which period members can check-in (respond Có/Không)
 */

exports.up = async function (knex) {
    const [hasCreationDay, hasCreationTime, hasStartDay, hasEndDay, hasNotifiedWeek] = await Promise.all([
        knex.schema.hasColumn('teams', 'checkin_creation_day'),
        knex.schema.hasColumn('teams', 'checkin_creation_time'),
        knex.schema.hasColumn('teams', 'checkin_start_day'),
        knex.schema.hasColumn('teams', 'checkin_end_day'),
        knex.schema.hasColumn('teams', 'checkin_notified_week'),
    ]);
    await knex.schema.table('teams', function (table) {
        if (!hasCreationDay) table.string('checkin_creation_day', 10).defaultTo('mon').comment('Day of week to create check-in notification');
        if (!hasCreationTime) table.string('checkin_creation_time', 5).defaultTo('20:00').comment('Time to create check-in notification (HH:mm UTC)');
        if (!hasStartDay) table.string('checkin_start_day', 10).defaultTo('fri').comment('Day when check-in period starts');
        if (!hasEndDay) table.string('checkin_end_day', 10).defaultTo('tue').comment('Day when check-in period ends');
        if (!hasNotifiedWeek) table.string('checkin_notified_week', 10).comment('Track which week check-in notification was sent (YYYY-WW)');
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
