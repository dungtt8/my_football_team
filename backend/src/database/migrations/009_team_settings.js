/**
 * Migration 008: Add team settings columns
 * Adds configurable settings for attendance cooldown, finance closing day/time
 */
exports.up = async (knex) => {
    const hasCol = (col) => knex.schema.hasColumn('teams', col);
    const [hasCooldown, hasFinanceDay, hasFinanceTime, hasAttendanceEnabled] = await Promise.all([
        hasCol('attendance_cooldown_minutes'),
        hasCol('finance_closing_day'),
        hasCol('finance_closing_time'),
        hasCol('attendance_enabled'),
    ]);

    await knex.schema.table('teams', (table) => {
        if (!hasCooldown) table.integer('attendance_cooldown_minutes').defaultTo(5).comment('Minutes before event start for check-in (1-60)');
        if (!hasFinanceDay) table.integer('finance_closing_day').defaultTo(1).comment('Day of month for fund closing (1-31)');
        if (!hasFinanceTime) table.string('finance_closing_time', 5).defaultTo('23:59').comment('Time for fund closing (HH:mm format)');
        if (!hasAttendanceEnabled) table.boolean('attendance_enabled').defaultTo(true).comment('Enable/disable attendance module');
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
