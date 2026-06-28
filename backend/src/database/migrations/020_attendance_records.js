/**
 * Migration 018: Recreate attendance_records table with correct schema
 * 
 * Stores check-in/absent records for each attendance session with status enum
 * Replaces the old schema from migration 001
 */

exports.up = async (knex) => {
    // Drop old table if exists (from migration 001)
    const exists = await knex.schema.hasTable('attendance_records');
    if (exists) {
        await knex.schema.dropTable('attendance_records');
    }

    await knex.schema.createTable('attendance_records', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('session_id').notNullable().references('attendance_sessions.id').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');

        // Status: attended (checked in), marked_absent (co-manager marked), pending (not checked in yet)
        table.enu('status', ['attended', 'marked_absent', 'pending']).defaultTo('pending');

        // When member checked in (null if marked_absent or pending)
        table.timestamp('checked_in_at').nullable();

        // Who marked this record (for marked_absent)
        table.bigInteger('marked_by').nullable().references('users.id');

        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        // Indexes for common queries
        table.index(['session_id']);
        table.index(['user_id', 'team_id']);
        table.index(['team_id', 'created_at']);
        table.unique(['session_id', 'user_id']); // One record per member per session
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('attendance_records');
};
