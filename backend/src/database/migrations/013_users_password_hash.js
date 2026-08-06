// Add password_hash column — required for password-based phone auth (register/login).
exports.up = (knex) => knex.schema.alterTable('users', (table) => {
    table.string('password_hash', 255).nullable();
});

exports.down = (knex) => knex.schema.alterTable('users', (table) => {
    table.dropColumn('password_hash');
});
