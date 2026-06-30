/**
 * Migration 003: Campaigns (ad-hoc fund collection)
 * Tables: campaigns, campaign_assignments
 */
exports.up = async (knex) => {
    // campaigns
    await knex.schema.createTable('campaigns', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
        table.string('name', 255).notNullable();
        table.decimal('amount_per_member', 12, 2).notNullable();
        table.timestamp('deadline').nullable();
        table.text('description');
        table.string('status', 50).notNullable().defaultTo('active'); // active, closed
        table.timestamp('closed_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'status']);
    });

    // campaign_assignments — state machine per member
    await knex.schema.createTable('campaign_assignments', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('campaign_id').notNullable().references('id').inTable('campaigns').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        // States: pending_confirmation → pending_approval → approved / rejected / exempt
        table.string('status', 50).notNullable().defaultTo('pending_confirmation');

        table.timestamp('confirmed_at').nullable();
        table.bigInteger('confirmed_by').nullable().references('id').inTable('users');

        table.timestamp('rejected_at').nullable();
        table.text('rejected_reason').nullable();

        table.timestamp('approved_at').nullable();
        table.bigInteger('approved_by').nullable().references('id').inTable('users');
        table.text('approval_notes').nullable();

        table.timestamp('exempt_at').nullable();
        table.text('exempt_reason').nullable();

        table.bigInteger('transaction_id').nullable().references('id').inTable('fund_transactions').onDelete('SET NULL');

        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique(['campaign_id', 'user_id']);
        table.index(['campaign_id', 'status']);
        table.index(['user_id', 'status']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('campaign_assignments');
    await knex.schema.dropTable('campaigns');
};
