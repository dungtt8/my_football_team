exports.up = async (knex) => {
    // PostgreSQL doesn't support .after() - just add column
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.timestamp('check_in_deadline').nullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.dropColumn('check_in_deadline');
    });
};
