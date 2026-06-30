/**
 * Migration 012: Add custom auto-session creation time
 * Allows teams to configure what time auto-create sessions should be processed
 */
exports.up = async (knex) => {
    const hasCol = await knex.schema.hasColumn('teams', 'auto_session_creation_time');
    if (!hasCol) {
        await knex.schema.table('teams', (table) => {
            table.string('auto_session_creation_time', 5).defaultTo('03:00').comment('Time to process auto-session creation (HH:mm format, UTC)');
        });
    }
};

exports.down = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.dropColumn('auto_session_creation_time');
    });
};
