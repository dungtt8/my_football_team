/**
 * Migration 009: Add transaction_type to fund_transactions
 * - 'income': khoản thu (member đóng quỹ, campaign)
 * - 'expense': khoản chi (tiền sân, tiền nước, ...)
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('fund_transactions', (table) => {
        table.string('transaction_type', 20).notNullable().defaultTo('expense'); // 'income' | 'expense'
        table.index(['team_id', 'transaction_type', 'status']);
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('fund_transactions', (table) => {
        table.dropIndex(['team_id', 'transaction_type', 'status']);
        table.dropColumn('transaction_type');
    });
};
