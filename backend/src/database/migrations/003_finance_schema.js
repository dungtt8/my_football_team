exports.up = async (knex) => {
    // Extend fund_transactions table with additional columns
    if (!(await knex.schema.hasColumn('fund_transactions', 'description'))) {
        await knex.schema.table('fund_transactions', (table) => {
            table.text('description').nullable();
            table.bigInteger('rejected_by').references('users.id').nullable();
            table.text('approval_notes').nullable();
            table.timestamp('rejected_at').nullable();
        });
    }

    // Create fund_balance_logs table
    await knex.schema.createTable('fund_balance_logs', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.bigInteger('transaction_id').notNullable().references('fund_transactions.id').onDelete('CASCADE');
        table.decimal('previous_balance', 12, 2).notNullable();
        table.decimal('new_balance', 12, 2).notNullable();
        table.decimal('change_amount', 12, 2).notNullable();
        table.text('description').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        
        // Indexes for performance
        table.index(['team_id']);
        table.index(['transaction_id']);
        table.index(['created_at']);
        table.index(['team_id', 'created_at']);
    });

    // Create approvals table
    await knex.schema.createTable('approvals', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.string('entity_type', 50).notNullable(); // 'transaction', 'campaign_confirmation'
        table.bigInteger('entity_id').notNullable();
        table.bigInteger('submitted_by').notNullable().references('users.id').onDelete('CASCADE');
        table.string('status', 50).defaultTo('pending'); // 'pending', 'approved', 'rejected'
        table.timestamp('created_at').defaultTo(knex.fn.now());
        
        // Indexes for performance
        table.index(['team_id']);
        table.index(['entity_type']);
        table.index(['status']);
        table.index(['team_id', 'entity_type', 'status']);
        table.index(['team_id', 'created_at']);
    });

    // Enable RLS on all three tables
    await knex.raw('ALTER TABLE fund_balance_logs ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE approvals ENABLE ROW LEVEL SECURITY');

    // fund_balance_logs RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view their team's fund balance logs"
    ON fund_balance_logs
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
    `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can insert fund balance logs"
    ON fund_balance_logs
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint
        AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
    `);

    // approvals RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view their team's approvals"
    ON approvals
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
    `);

    await knex.raw(`
    CREATE POLICY "Team members can submit approvals"
    ON approvals
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint);
    `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update approvals"
    ON approvals
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
        AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
    `);
};

exports.down = async (knex) => {
    // Drop tables in reverse order
    await knex.schema.dropTableIfExists('approvals');
    await knex.schema.dropTableIfExists('fund_balance_logs');
    
    // Remove added columns from fund_transactions
    if (await knex.schema.hasColumn('fund_transactions', 'description')) {
        await knex.schema.table('fund_transactions', (table) => {
            table.dropColumn('description');
            table.dropColumn('rejected_by');
            table.dropColumn('approval_notes');
            table.dropColumn('rejected_at');
        });
    }
};
