/**
 * Migration 010: Add a dedicated deadline time for auto-created attendance
 * sessions, so admins can set it independently instead of reusing
 * checkin_creation_time (the notification time) as the deadline time.
 * Defaults to the same value as checkin_creation_time so existing teams'
 * behavior doesn't change until they explicitly configure it.
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('teams', (table) => {
        table.string('checkin_deadline_time', 5).defaultTo('13:00'); // UTC (8 PM GMT+7)
    });

    // Backfill existing teams to keep current behavior (deadline time ==
    // notification time) until they explicitly change it.
    await knex('teams').update({
        checkin_deadline_time: knex.raw('??', ['checkin_creation_time']),
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('teams', (table) => {
        table.dropColumn('checkin_deadline_time');
    });
};
