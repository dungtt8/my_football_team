exports.up = async (knex) => {
    // Enable RLS on all business tables
    await knex.raw('ALTER TABLE teams ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE team_members ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE fund_campaigns ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE inngest_logs ENABLE ROW LEVEL SECURITY');

    // teams RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view their team"
    ON teams
    FOR SELECT
    USING (id = (current_setting('app.current_team_id'))::bigint);
  `);

    // users RLS policies - users are global, no team filtering needed
    await knex.raw(`
    CREATE POLICY "All authenticated users can view users"
    ON users
    FOR SELECT
    USING (true);
  `);

    // team_members RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view team members in their team"
    ON team_members
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can insert team members"
    ON team_members
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update team members"
    ON team_members
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    // fund_campaigns RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view their team's campaigns"
    ON fund_campaigns
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can create campaigns"
    ON fund_campaigns
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update campaigns"
    ON fund_campaigns
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    // fund_transactions RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view their team's transactions"
    ON fund_transactions
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

    await knex.raw(`
    CREATE POLICY "Users can create transactions for their team"
    ON fund_transactions
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can approve transactions"
    ON fund_transactions
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    // campaign_assignments RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view campaign assignments for their team"
    ON campaign_assignments
    FOR SELECT
    USING (campaign_id IN (
      SELECT id FROM fund_campaigns WHERE team_id = (current_setting('app.current_team_id'))::bigint
    ));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can manage campaign assignments"
    ON campaign_assignments
    FOR INSERT
    WITH CHECK (campaign_id IN (
      SELECT id FROM fund_campaigns WHERE team_id = (current_setting('app.current_team_id'))::bigint
    ) AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update campaign assignments"
    ON campaign_assignments
    FOR UPDATE
    USING (campaign_id IN (
      SELECT id FROM fund_campaigns WHERE team_id = (current_setting('app.current_team_id'))::bigint
    ) AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    // attendance_records RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view attendance for their team"
    ON attendance_records
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

    await knex.raw(`
    CREATE POLICY "Users can create attendance records for their team"
    ON attendance_records
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

    await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update attendance records"
    ON attendance_records
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

    // inngest_logs RLS policies
    await knex.raw(`
    CREATE POLICY "Users can view logs for their team"
    ON inngest_logs
    FOR SELECT
    USING (team_id IS NULL OR team_id = (current_setting('app.current_team_id'))::bigint);
};

exports.down = async (knex) => {
    // Disable RLS on all tables
    await knex.raw('ALTER TABLE teams DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE team_members DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE fund_campaigns DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE fund_transactions DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE campaign_assignments DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE inngest_logs DISABLE ROW LEVEL SECURITY');
};
