exports.up = async (knex) => {
    // teams table
    await knex.schema.createTable('teams', (table) => {
        table.bigIncrements('id').primary();
        table.string('name', 255).notNullable();
        table.text('description');
        table.bigInteger('owner_id').references('users.id');
        table.string('viet_qr_account', 255);
        table.string('viet_qr_bank_account', 255);
        table.string('viet_qr_bank_name', 255);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });

    // users table
    await knex.schema.createTable('users', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.string('email', 255).notNullable();
        table.string('full_name', 255);
        table.string('zalo_user_id', 255);
        table.string('phone', 20);
        table.string('role', 50).notNullable(); // 'owner', 'co_manager', 'member'
        table.string('status', 50).defaultTo('active'); // 'active', 'inactive'
        table.timestamp('deactivated_at').nullable();
        table.timestamp('last_login_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
        table.unique(['team_id', 'email']);
        table.unique(['team_id', 'zalo_user_id']);
        table.index(['team_id', 'status']);
        table.index(['team_id', 'role']);
    });

    // fund_campaigns table
    await knex.schema.createTable('fund_campaigns', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.string('name', 255).notNullable();
        table.text('description');
        table.string('campaign_type', 50).notNullable(); // 'monthly', 'ad_hoc'
        table.decimal('amount_per_member', 12, 2);
        table.decimal('total_target_amount', 12, 2);
        table.string('cashflow_category', 50);
        table.string('status', 50).defaultTo('active');
        table.timestamp('deadline').nullable();
        table.bigInteger('created_by').notNullable().references('users.id');
        table.string('member_scope', 50).notNullable(); // 'all_active', 'selected_members'
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'deadline']);
    });

    // fund_transactions table
    await knex.schema.createTable('fund_transactions', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.bigInteger('campaign_id').references('fund_campaigns.id');
        table.bigInteger('submitted_by').notNullable().references('users.id');
        table.decimal('amount', 12, 2).notNullable();
        table.string('status', 50).defaultTo('pending');
        table.text('rejection_reason');
        table.string('bill_image_url', 255);
        table.timestamp('transaction_date').notNullable();
        table.bigInteger('approved_by').references('users.id');
        table.timestamp('approved_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.checkRaw('amount > 0');
        table.index(['team_id', 'status']);
        table.index(['campaign_id']);
    });

    // campaign_assignments table
    await knex.schema.createTable('campaign_assignments', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('campaign_id').notNullable().references('fund_campaigns.id').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.string('status', 50).defaultTo('unpaid');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['campaign_id', 'user_id']);
    });

    // attendance_records table
    await knex.schema.createTable('attendance_records', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.timestamp('session_date').notNullable();
        table.boolean('attended').defaultTo(true);
        table.text('notes');
        table.bigInteger('created_by').notNullable().references('users.id');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['team_id', 'user_id', 'session_date']);
        table.index(['team_id', 'user_id']);
    });

    // inngest_logs table
    await knex.schema.createTable('inngest_logs', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').references('teams.id');
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
    await knex.schema.dropTable('attendance_records');
    await knex.schema.dropTable('campaign_assignments');
    await knex.schema.dropTable('fund_transactions');
    await knex.schema.dropTable('fund_campaigns');
    await knex.schema.dropTable('users');
    await knex.schema.dropTable('teams');
};
