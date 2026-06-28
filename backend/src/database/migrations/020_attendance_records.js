/**
 * Migration 020: Recreate attendance_records table with correct schema (data-safe)
 * 
 * Stores check-in/absent records for each attendance session with status enum
 * Only drops old schema if it exists - preserves data if new schema already applied
 */

exports.up = async (knex) => {
    const tableExists = await knex.schema.hasTable('attendance_records');
    
    if (tableExists) {
        // Check if table has the new schema (session_id column)
        const hasSessionId = await knex.schema.hasColumn('attendance_records', 'session_id');
        
        if (hasSessionId) {
            // Already has correct schema, skip
            console.log('✅ attendance_records table already has correct schema, skipping...');
            return;
        } else {
            // Has old schema, drop and recreate
            console.log('🔄 Dropping old attendance_records schema...');
            await knex.schema.dropTable('attendance_records');
        }
    }

    console.log('📝 Creating attendance_records table with new schema...');
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
