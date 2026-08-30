exports.up = async (knex) => {
  await knex.schema.createTable('password_reset_code', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('code_hash', 255).notNullable();
    table.timestamp('expires_at').notNullable();
    table.integer('attempts').notNullable().defaultTo(0);
    table.timestamp('consumed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'consumed_at', 'expires_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('password_reset_code');
};
