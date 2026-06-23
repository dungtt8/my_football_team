exports.up = async (knex) => {
    await knex.schema.alterTable('attendance_sessions', (table) => {
        // Deadline for members to check in (null = no deadline)
        table.timestamp('check_in_deadline').nullable().after('session_date');
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.dropColumn('check_in_deadline');
    });
};
