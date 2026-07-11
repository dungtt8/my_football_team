/**
 * Migration 011: Allow manager to override the amount charged per member
 * when approving a campaign assignment (teams don't always collect the
 * same amount from every member).
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('campaign_assignments', (table) => {
        table.decimal('approved_amount', 12, 2).nullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('campaign_assignments', (table) => {
        table.dropColumn('approved_amount');
    });
};
