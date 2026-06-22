exports.up = async (knex) => {
    // campaigns table for ad-hoc campaigns (distinct from fund_campaigns)
    await knex.schema.createTable('campaigns', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.bigInteger('created_by').notNullable().references('users.id').onDelete('RESTRICT');
        table.string('name', 255).notNullable();
        table.decimal('amount_per_member', 12, 2).notNullable();
        table.timestamp('deadline').nullable();
        table.text('description');
        table.string('status', 50).notNullable().defaultTo('active'); // 'active', 'closed'
        table.timestamp('closed_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'status']);
        table.index(['created_by']);
    });

    // campaign_assignments_v2 table for ad-hoc campaign assignments with state machine
    // Using v2 suffix to differentiate from existing fund campaign assignments
    await knex.schema.createTable('campaign_assignments_v2', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('campaign_id').notNullable().references('campaigns.id').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.string('status', 50).notNullable().defaultTo('pending_confirmation'); // 'pending_confirmation', 'pending_approval', 'approved', 'rejected', 'exempt'
        
        // Confirmation flow
        table.timestamp('confirmed_at').nullable();
        table.bigInteger('confirmed_by').nullable().references('users.id').onDelete('RESTRICT');
        
        // Rejection flow
        table.timestamp('rejected_at').nullable();
        table.text('rejected_reason').nullable();
        
        // Approval flow
        table.timestamp('approved_at').nullable();
        table.bigInteger('approved_by').nullable().references('users.id').onDelete('RESTRICT');
        table.text('approval_notes').nullable();
        
        // Exemption flow
        table.timestamp('exempt_at').nullable();
        table.text('exempt_reason').nullable();
        
        // Transaction reference
        table.bigInteger('transaction_id').nullable().references('fund_transactions.id').onDelete('SET NULL');
        
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique(['campaign_id', 'user_id']);
        table.index(['campaign_id', 'status']);
        table.index(['user_id', 'status']);
    });

    // Enable RLS on new tables
    await knex.raw('ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE campaign_assignments_v2 ENABLE ROW LEVEL SECURITY');

    // campaigns RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view campaigns for their team"
    ON campaigns
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can create campaigns"
    ON campaigns
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update campaigns"
    ON campaigns
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can delete campaigns"
    ON campaigns
    FOR DELETE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    // campaign_assignments_v2 RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view campaign assignments for their team"
    ON campaign_assignments_v2
    FOR SELECT
    USING (campaign_id IN (
      SELECT id FROM campaigns WHERE team_id = (current_setting('app.current_team_id'))::bigint
    ));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can insert campaign assignments"
    ON campaign_assignments_v2
    FOR INSERT
    WITH CHECK (campaign_id IN (
      SELECT id FROM campaigns WHERE team_id = (current_setting('app.current_team_id'))::bigint
    ) AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update campaign assignments"
    ON campaign_assignments_v2
    FOR UPDATE
    USING (campaign_id IN (
      SELECT id FROM campaigns WHERE team_id = (current_setting('app.current_team_id'))::bigint
    ) AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can delete campaign assignments"
    ON campaign_assignments_v2
    FOR DELETE
    USING (campaign_id IN (
      SELECT id FROM campaigns WHERE team_id = (current_setting('app.current_team_id'))::bigint
    ) AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);
};

exports.down = async (knex) => {
    // Disable RLS
    await knex.raw('ALTER TABLE campaign_assignments_v2 DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY');

    // Drop tables in reverse order (respecting foreign keys)
    await knex.schema.dropTable('campaign_assignments_v2');
    await knex.schema.dropTable('campaigns');
};
