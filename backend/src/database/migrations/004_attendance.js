/**
 * Migration 004: Attendance system
 *
 * Flow:
 *   1. Manager creates an attendance_session (auto via schedule or manually)
 *   2. System auto-creates one attendance_checkin per active team member
 *   3. Members respond yes/no before check_in_deadline
 *   4. On session close → points awarded to members who responded 'yes'
 *
 * Tables: attendance_sessions, attendance_checkins, user_points, leaderboard_archives
 */
exports.up = async (knex) => {
    // attendance_sessions — one per event (training / match)
    await knex.schema.createTable('attendance_sessions', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.bigInteger('created_by').nullable().references('id').inTable('users'); // null = auto-created
        table.timestamp('session_date').notNullable();
        table.timestamp('check_in_deadline').nullable(); // deadline for members to respond
        table.string('location', 255).nullable();
        table.enu('session_type', ['training', 'match']).notNullable().defaultTo('training');
        table.text('description').nullable();
        table.enu('status', ['active', 'closed']).defaultTo('active');
        table.timestamp('closed_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'session_date']);
        table.index(['team_id', 'status']);
    });

    // attendance_checkins — one per (session × user), response = yes/no/null
    await knex.schema.createTable('attendance_checkins', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('session_id').notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');
        table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.enu('response', ['yes', 'no']).nullable().defaultTo(null);
        table.timestamp('responded_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique(['session_id', 'user_id']);
        table.index(['team_id', 'session_id']);
        table.index(['user_id', 'team_id']);
    });

    // user_points — points ledger (YYYY-MM granularity)
    await knex.schema.createTable('user_points', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.integer('points').notNullable();
        table.string('reason', 255).notNullable(); // 'attendance_yes', 'absence_penalty', etc.
        table.string('month', 7).notNullable(); // YYYY-MM
        table.bigInteger('session_id').nullable().references('id').inTable('attendance_sessions').onDelete('SET NULL');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['team_id', 'month']);
        table.index(['user_id', 'team_id', 'month']);
    });

    // leaderboard_archives — monthly snapshots of top 3
    await knex.schema.createTable('leaderboard_archives', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
        table.string('month', 7).notNullable(); // YYYY-MM
        table.jsonb('top_3').defaultTo(knex.raw("'[]'::jsonb"));
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['team_id', 'month']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('leaderboard_archives');
    await knex.schema.dropTable('user_points');
    await knex.schema.dropTable('attendance_checkins');
    await knex.schema.dropTable('attendance_sessions');
};
