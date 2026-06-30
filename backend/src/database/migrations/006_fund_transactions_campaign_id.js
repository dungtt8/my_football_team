/**
 * Migration 006: Add campaign_id to fund_transactions
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('fund_transactions', (table) => {
        table.bigInteger('campaign_id').nullable().references('id').inTable('campaigns').onDelete('SET NULL');
        table.index(['campaign_id']);
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('fund_transactions', (table) => {
        table.dropIndex(['campaign_id']);
        table.dropColumn('campaign_id');
    });
};
