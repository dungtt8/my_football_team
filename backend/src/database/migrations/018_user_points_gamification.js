/**
 * Create user_points table for gamification system
 * Tracks points earned by users per month per team
 */
exports.up = async (knex) => {
    // Check if table already exists (from duplicate old migration)
    const exists = await knex.schema.hasTable('user_points');
    if (exists) {
        console.log('✅ user_points table already exists, skipping...');
        return;
    }

    // Create user_points table
    await knex.schema.createTable('user_points', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.integer('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.integer('points').notNullable().defaultTo(0);
        table.string('reason').notNullable(); // 'check_in', 'absence_penalty', 'quiz_correct', etc
        table.string('month').notNullable(); // 'YYYY-MM' format
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        // Indexes for common queries
        table.index(['team_id', 'month']);
        table.index(['user_id', 'team_id', 'month']);
        table.index(['month']);

        // Unique constraint: one record per user-team-reason per session/event
        // (this allows multiple points for same reason in different check-ins)
    });

    // Enable RLS if using PostgreSQL
    try {
        await knex.raw('ALTER TABLE user_points ENABLE ROW LEVEL SECURITY');
    } catch (err) {
        // Might not be PostgreSQL or RLS already enabled
    }
};

exports.down = async (knex) => {
    await knex.schema.dropTableIfExists('user_points');
};
