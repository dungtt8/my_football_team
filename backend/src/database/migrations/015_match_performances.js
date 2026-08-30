/**
 * Migration 015: Match performance tracking
 *
 * Adds a match result (score) to attendance_sessions, and a new
 * match_performances table for members to self-report goals/assists
 * on a match session, subject to manager approval.
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.integer('home_score').nullable();
        table.integer('away_score').nullable();
        table.bigInteger('result_recorded_by').nullable().references('id').inTable('users');
        table.timestamp('result_recorded_at').nullable();
    });

    await knex.schema.createTable('match_performances', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('session_id').notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.integer('goals').notNullable().defaultTo(0);
        table.integer('assists').notNullable().defaultTo(0);
        table.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
        table.timestamp('submitted_at').nullable();
        table.bigInteger('reviewed_by').nullable().references('id').inTable('users');
        table.timestamp('reviewed_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique(['session_id', 'user_id']);
        table.index(['team_id', 'session_id']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('match_performances');
    await knex.schema.alterTable('attendance_sessions', (table) => {
        table.dropColumn('home_score');
        table.dropColumn('away_score');
        table.dropColumn('result_recorded_by');
        table.dropColumn('result_recorded_at');
    });
};
