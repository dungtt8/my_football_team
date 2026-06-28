/**
 * Remove duplicate key constraint on attendance_sessions
 * Allow multiple sessions per team per date (e.g., training + match same day)
 */
exports.up = async (knex) => {
    // Use raw SQL for reliable constraint dropping
    await knex.raw(`
        ALTER TABLE attendance_sessions 
        DROP CONSTRAINT IF EXISTS attendance_sessions_team_id_session_date_unique;
    `);
};

exports.down = async (knex) => {
    // Restore the unique constraint if rolling back
    await knex.raw(`
        ALTER TABLE attendance_sessions 
        ADD CONSTRAINT attendance_sessions_team_id_session_date_unique 
        UNIQUE (team_id, session_date);
    `);
};
