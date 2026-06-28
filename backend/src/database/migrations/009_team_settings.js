/**
 * Migration 008: Add team settings columns
 * Adds configurable settings for attendance cooldown, finance closing day/time
 */
exports.up = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.integer('attendance_cooldown_minutes').defaultTo(5).comment('Minutes before event start for check-in (1-60)');
        table.integer('finance_closing_day').defaultTo(1).comment('Day of month for fund closing (1-31)');
        table.string('finance_closing_time', 5).defaultTo('23:59').comment('Time for fund closing (HH:mm format)');
        table.boolean('attendance_enabled').defaultTo(true).comment('Enable/disable attendance module');
    });
};

exports.down = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.dropColumn('attendance_cooldown_minutes');
        table.dropColumn('finance_closing_day');
        table.dropColumn('finance_closing_time');
        table.dropColumn('attendance_enabled');
    });
};
