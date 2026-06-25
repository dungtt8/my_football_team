/**
 * Remove duplicate key constraint on attendance_sessions
 * Allow multiple sessions per team per date (e.g., training + match same day)
 */
exports.up = async (knex) => {
    // Drop the unique constraint that prevents multiple sessions same team/date
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.dropUnique(['team_id', 'session_date']);
    });
};

exports.down = async (knex) => {
    // Restore the unique constraint if rolling back
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.unique(['team_id', 'session_date']);
    });
};
