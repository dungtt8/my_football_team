// thêm để gen code
exports.up = (knex) => knex.schema.createTable('zalo_link_codes', (table) => {
    table.string('code', 10).primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
});

exports.down = (knex) => knex.schema.dropTable('zalo_link_codes');