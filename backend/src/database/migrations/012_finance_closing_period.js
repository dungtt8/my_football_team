/**
 * Migration 010: Add finance payment deadline (monthly recurring)
 * Adds start_day, end_day (day of month 1-31) for monthly payment deadlines
 */
exports.up = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.integer('finance_payment_start_day').nullable().comment('Start day of month for payment deadline (1-31)');
        table.integer('finance_payment_end_day').nullable().comment('End day of month for payment deadline (1-31)');
        table.string('finance_payment_notified_month', 7).nullable().comment('Last month notified (YYYY-MM format)');
    });
};

exports.down = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.dropColumn('finance_payment_start_day');
        table.dropColumn('finance_payment_end_day');
        table.dropColumn('finance_payment_notified_month');
    });
};
