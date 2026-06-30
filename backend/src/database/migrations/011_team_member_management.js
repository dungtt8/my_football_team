module.exports = {
    up: async (knex) => {
        // Add jersey_number column to team_members
        const hasJersey = await knex.schema.hasColumn('team_members', 'jersey_number');
        if (!hasJersey) {
            await knex.schema.table('team_members', (table) => {
                table.integer('jersey_number').nullable();
            });
        }

        // Add index for jersey lookups
        await knex.raw('CREATE INDEX IF NOT EXISTS idx_team_members_jersey ON team_members(team_id, jersey_number)');
    },

    down: async (knex) => {
        // Rollback: remove index and column
        await knex.raw('DROP INDEX IF EXISTS idx_team_members_jersey');
        await knex.schema.table('team_members', (table) => {
            table.dropColumn('jersey_number');
        });
    },
};
