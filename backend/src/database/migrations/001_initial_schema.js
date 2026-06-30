/**
 * Migration 001: Base schema
 * Tables: users, teams (with all settings), team_members, inngest_logs
 */
exports.up = async (knex) => {
    // users
    await knex.schema.createTable('users', (table) => {
        table.bigIncrements('id').primary();
        table.string('email', 255).notNullable().unique();
        table.string('full_name', 255);
        table.string('zalo_user_id', 255);
        table.string('phone', 20);
        table.string('status', 50).defaultTo('active');
        table.timestamp('deactivated_at').nullable();
        table.timestamp('last_login_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });

    // teams (all settings consolidated)
    await knex.schema.createTable('teams', (table) => {
        table.bigIncrements('id').primary();
        table.string('name', 255).notNullable();
        table.text('description');
        table.bigInteger('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('invite_code', 10).unique().nullable();

        // Banking / payments
        table.string('bank_account_number', 50).nullable();
        table.string('bank_name', 100).nullable();
        table.string('fund_qr_code_url', 500).nullable();

        // Finance settings
        table.integer('finance_closing_day').defaultTo(1);
        table.string('finance_closing_time', 5).defaultTo('23:59');
        table.integer('finance_payment_start_day').nullable();
        table.integer('finance_payment_end_day').nullable();
        table.string('finance_payment_notified_month', 7).nullable();

        // Attendance
        table.boolean('attendance_enabled').defaultTo(true);

        // Auto-session scheduling
        table.boolean('auto_create_sessions').defaultTo(false);
        table.enu('session_frequency', ['disabled', 'daily', 'weekly']).defaultTo('disabled');
        table.string('session_days', 255).defaultTo('');
        table.string('session_time', 5).defaultTo('18:00');
        table.enu('session_type', ['training', 'match', 'both']).defaultTo('training');
        table.string('session_location', 255).nullable();
        table.string('auto_session_creation_time', 5).defaultTo('03:00');
        table.timestamp('last_auto_session_created_at').nullable();

        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });

    // team_members
    await knex.schema.createTable('team_members', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.enu('role', ['owner', 'co_manager', 'member']).notNullable();
        table.string('status', 50).defaultTo('active');
        table.integer('jersey_number').nullable();
        table.timestamp('deactivated_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
        table.unique(['team_id', 'user_id']);
        table.index(['team_id', 'status']);
        table.index(['team_id', 'role']);
        table.index(['user_id', 'status']);
    });

    // inngest_logs
    await knex.schema.createTable('inngest_logs', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').nullable().references('id').inTable('teams').onDelete('CASCADE');
        table.string('event_name', 255).notNullable();
        table.jsonb('event_data');
        table.string('status', 50);
        table.text('error_message');
        table.integer('attempt_count').defaultTo(1);
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('inngest_logs');
    await knex.schema.dropTable('team_members');
    await knex.schema.dropTable('teams');
    await knex.schema.dropTable('users');
};
