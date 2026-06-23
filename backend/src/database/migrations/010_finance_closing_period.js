/**
 * Migration 010: Add finance closing period with date range
 * Adds from_date, to_date, and notified flag for fund closing periods
 */
exports.up = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.date('finance_closing_from_date').nullable().comment('Start date of fund closing period');
        table.date('finance_closing_to_date').nullable().comment('End date of fund closing period');
        table.boolean('finance_closing_notified').defaultTo(false).comment('Whether first-day notification has been sent');
    });
};

exports.down = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.dropColumn('finance_closing_from_date');
        table.dropColumn('finance_closing_to_date');
        table.dropColumn('finance_closing_notified');
    });
};
