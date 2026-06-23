/**
 * Migration 014: Create attendance_checkins table
 * 
 * Stores member responses (Có/Không) for attendance sessions
 * Used for pre-event confirmation before actual check-in
 */

exports.up = function (knex) {
    return knex.schema.createTable('attendance_checkins', function (table) {
        table.increments('id').primary();

        table.integer('team_id').unsigned().notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.integer('member_id').unsigned().notNullable().references('id').inTable('team_members').onDelete('CASCADE');
        table.integer('session_id').unsigned().notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');

        // Check-in response: yes, no, or null (not responded yet)
        table.enum('response', ['yes', 'no', null]).defaultTo(null).comment('Member response: yes (tôi tham gia), no (tôi không tham gia)');

        // Timestamps
        table.timestamp('responded_at').nullable().comment('When member responded');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        // Indexes
        table.index(['team_id', 'session_id']);
        table.index(['member_id']);
        table.unique(['session_id', 'member_id']); // One response per member per session
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('attendance_checkins');
};
