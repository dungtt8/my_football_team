/**
 * Migration 009: Add session scheduling settings
 * Allows teams to auto-create attendance sessions based on schedule
 */
exports.up = async (knex) => {
    const hasCol = (col) => knex.schema.hasColumn('teams', col);
    const [hasAutoCreate, hasFrequency, hasDays, hasTime, hasType, hasLocation, hasLastCreated] = await Promise.all([
        hasCol('auto_create_sessions'),
        hasCol('session_frequency'),
        hasCol('session_days'),
        hasCol('session_time'),
        hasCol('session_type'),
        hasCol('session_location'),
        hasCol('last_auto_session_created_at'),
    ]);

    await knex.schema.table('teams', (table) => {
        if (!hasAutoCreate) table.boolean('auto_create_sessions').defaultTo(false).comment('Enable automatic session creation');
        if (!hasFrequency) table.enum('session_frequency', ['disabled', 'daily', 'weekly', 'custom']).defaultTo('disabled').comment('Frequency of auto-created sessions');
        if (!hasDays) table.string('session_days', 255).defaultTo('').comment('Days for weekly sessions: "mon,wed,fri" or empty for daily');
        if (!hasTime) table.string('session_time', 5).defaultTo('18:00').comment('Time for auto-created sessions (HH:mm format)');
        if (!hasType) table.enum('session_type', ['training', 'match', 'both']).defaultTo('training').comment('Type of auto-created sessions');
        if (!hasLocation) table.string('session_location', 255).nullable().comment('Default location for auto-created sessions');
        if (!hasLastCreated) table.timestamp('last_auto_session_created_at').nullable().comment('Track last auto-creation to avoid duplicates');
    });
};

exports.down = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.dropColumn('auto_create_sessions');
        table.dropColumn('session_frequency');
        table.dropColumn('session_days');
        table.dropColumn('session_time');
        table.dropColumn('session_type');
        table.dropColumn('session_location');
        table.dropColumn('last_auto_session_created_at');
    });
};
