/**
 * Migration 002: Finance & notifications
 * Tables: notifications, fund_transactions, fund_balance_logs, approvals
 */
exports.up = async (knex) => {
    // notifications
    await knex.schema.createTable('notifications', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.string('message', 1000).notNullable();
        table.jsonb('metadata').defaultTo(knex.raw("'{}'::jsonb"));
        table.boolean('is_read').defaultTo(false);
        table.timestamp('read_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['user_id', 'is_read']);
        table.index(['team_id', 'created_at']);
    });

    // fund_transactions
    await knex.schema.createTable('fund_transactions', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.bigInteger('submitted_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.decimal('amount', 12, 2).notNullable();
        table.string('status', 50).defaultTo('pending'); // pending, approved, rejected
        table.text('description').nullable();
        table.text('rejection_reason').nullable();
        table.text('approval_notes').nullable();
        table.string('bill_image_url', 255).nullable();
        table.timestamp('transaction_date').notNullable();
        table.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('approved_at').nullable();
        table.bigInteger('rejected_by').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('rejected_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'status']);
    });

    // fund_balance_logs
    await knex.schema.createTable('fund_balance_logs', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.bigInteger('transaction_id').notNullable().references('id').inTable('fund_transactions').onDelete('CASCADE');
        table.decimal('previous_balance', 12, 2).notNullable();
        table.decimal('new_balance', 12, 2).notNullable();
        table.decimal('change_amount', 12, 2).notNullable();
        table.text('description').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'created_at']);
    });

    // approvals
    await knex.schema.createTable('approvals', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.string('entity_type', 50).notNullable(); // 'transaction', 'campaign_confirmation'
        table.bigInteger('entity_id').notNullable();
        table.bigInteger('submitted_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('status', 50).defaultTo('pending'); // pending, approved, rejected
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'entity_type', 'status']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('approvals');
    await knex.schema.dropTable('fund_balance_logs');
    await knex.schema.dropTable('fund_transactions');
    await knex.schema.dropTable('notifications');
};
