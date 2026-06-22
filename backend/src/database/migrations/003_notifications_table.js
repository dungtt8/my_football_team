exports.up = async (knex) => {
    // notifications table
    await knex.schema.createTable('notifications', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
        table.string('message', 1000).notNullable();
        table.jsonb('metadata').defaultTo(knex.raw("'{}'::jsonb"));
        table.boolean('is_read').defaultTo(false);
        table.timestamp('read_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['user_id', 'is_read']);
        table.index(['team_id', 'created_at']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('notifications');
};
