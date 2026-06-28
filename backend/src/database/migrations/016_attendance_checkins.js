/**
 * Migration 016: Create attendance_checkins table
 * 
 * Stores member responses (Có/Không) for attendance sessions
 * Used for pre-event confirmation before actual check-in
 */

exports.up = function (knex) {
    return knex.schema.hasTable('attendance_checkins').then(exists => {
        if (exists) {
            console.log('✅ attendance_checkins table already exists, skipping...');
            return;
        }
        
        return knex.schema.createTable('attendance_checkins', function (table) {
            table.bigIncrements('id').primary();

            table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
            table.bigInteger('member_id').notNullable().references('id').inTable('team_members').onDelete('CASCADE');
            table.bigInteger('session_id').notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');

            // Check-in response: yes, no, or null (not responded yet)
            table.enum('response', ['yes', 'no']).nullable().defaultTo(null).comment('Member response: yes (tôi tham gia), no (tôi không tham gia)');

            // Timestamps
            table.timestamp('responded_at').nullable().comment('When member responded');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());

            // Indexes
            table.index(['team_id', 'session_id']);
            table.index(['member_id']);
            table.unique(['session_id', 'member_id']); // One response per member per session
        });
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('attendance_checkins');
};
