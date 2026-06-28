exports.up = async (knex) => {
  // Check if tables already exist (from duplicate old migration)
  const sessionsExists = await knex.schema.hasTable('attendance_sessions');
  const gamificationExists = await knex.schema.hasTable('gamification_points');
  const leaderboardExists = await knex.schema.hasTable('leaderboard_archives');
  
  if (sessionsExists && gamificationExists && leaderboardExists) {
    console.log('✅ attendance tables already exist, skipping...');
    return;
  }

  // attendance_sessions table
  if (!sessionsExists) {
    await knex.schema.createTable('attendance_sessions', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
      table.bigInteger('created_by').notNullable().references('users.id');
      table.timestamp('session_date').notNullable();
      table.string('location', 255);
      table.enu('session_type', ['training', 'match']).notNullable();
      table.text('description');
      table.enu('status', ['active', 'closed']).defaultTo('active');
      table.timestamp('closed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['team_id', 'session_date'], { indexName: 'attendance_sessions_team_id_session_date_unique' });
      table.index(['team_id', 'session_date']);
      table.index(['team_id', 'status']);
    });
  }

  // gamification_points table
  if (!gamificationExists) {
    await knex.schema.createTable('gamification_points', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
      table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
      table.integer('points').notNullable();
      table.string('reason', 255).notNullable();
      table.string('month', 7).notNullable(); // YYYY-MM format
      table.bigInteger('session_id').references('attendance_sessions.id').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['team_id', 'month']);
      table.index(['user_id', 'month']);
    });
  }

  // leaderboard_archives table
  if (!leaderboardExists) {
    await knex.schema.createTable('leaderboard_archives', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
      table.string('month', 7).notNullable(); // YYYY-MM format
      table.jsonb('top_3').defaultTo(knex.raw("'[]'::jsonb"));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['team_id', 'month']);
      table.index(['team_id', 'created_at']);
    });
  }

  // Enable RLS on all new tables (if they were just created)
  if (!sessionsExists) {
    await knex.raw('ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY');
  }
  if (!gamificationExists) {
    await knex.raw('ALTER TABLE gamification_points ENABLE ROW LEVEL SECURITY');
  }
  if (!leaderboardExists) {
    await knex.raw('ALTER TABLE leaderboard_archives ENABLE ROW LEVEL SECURITY');
  }

  // attendance_sessions RLS policies
  await knex.raw(`
    CREATE POLICY "Users can view attendance sessions for their team"
    ON attendance_sessions
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

  await knex.raw(`
    CREATE POLICY "Only owner/co_manager can create attendance sessions"
    ON attendance_sessions
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

  await knex.raw(`
    CREATE POLICY "Only owner/co_manager can update attendance sessions"
    ON attendance_sessions
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

  // gamification_points RLS policies
  await knex.raw(`
    CREATE POLICY "Users can view gamification points for their team"
    ON gamification_points
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

  await knex.raw(`
    CREATE POLICY "Only owner/co_manager can manage gamification points"
    ON gamification_points
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

  // leaderboard_archives RLS policies
  await knex.raw(`
    CREATE POLICY "Users can view leaderboard archives for their team"
    ON leaderboard_archives
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

  await knex.raw(`
    CREATE POLICY "Only owner/co_manager can create leaderboard archives"
    ON leaderboard_archives
    FOR INSERT
    WITH CHECK (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTable('leaderboard_archives');
  await knex.schema.dropTable('gamification_points');
  await knex.schema.dropTable('attendance_sessions');
};
