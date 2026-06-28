/**
 * Migration 019: Add updated_at column to teams table
 * Enables tracking of last team configuration update
 */

exports.up = async (knex) => {
    // Check if column exists before adding
    const hasColumn = await knex.schema.hasColumn('teams', 'updated_at');

    if (!hasColumn) {
        await knex.schema.alterTable('teams', (table) => {
            table.timestamp('updated_at').defaultTo(knex.fn.now()).after('created_at');
        });
        console.log('✓ Added updated_at column to teams table');
    }
};

exports.down = async (knex) => {
    await knex.schema.alterTable('teams', (table) => {
        table.dropColumn('updated_at');
    });
    console.log('✓ Removed updated_at column from teams table');
};
