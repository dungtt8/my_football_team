exports.up = async (knex) => {
    // Check if column already exists
    const hasColumn = await knex.schema.hasColumn('attendance_sessions', 'check_in_deadline');
    if (hasColumn) {
        console.log('✅ check_in_deadline column already exists, skipping...');
        return;
    }

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
