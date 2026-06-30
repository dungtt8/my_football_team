/**
 * Migration 005: Add checkin schedule columns to teams
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('teams', (table) => {
        table.string('checkin_creation_day', 10).defaultTo('mon');
        table.string('checkin_creation_time', 5).defaultTo('13:00'); // UTC (8 PM GMT+7)
        table.string('checkin_start_day', 10).defaultTo('fri');
        table.string('checkin_end_day', 10).defaultTo('tue');
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('teams', (table) => {
        table.dropColumn('checkin_creation_day');
        table.dropColumn('checkin_creation_time');
        table.dropColumn('checkin_start_day');
        table.dropColumn('checkin_end_day');
    });
};
