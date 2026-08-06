// Set a shared default password for users created before password auth existed
// (password_hash IS NULL). They should change it after logging in.
// Set via LEGACY_DEFAULT_PASSWORD env var when running this migration — never
// hardcode the actual password in source control.
const bcrypt = require('bcryptjs');

exports.up = async (knex) => {
    const defaultPassword = process.env.LEGACY_DEFAULT_PASSWORD;
    if (!defaultPassword) {
        throw new Error('LEGACY_DEFAULT_PASSWORD env var is required to run this migration');
    }
    const hash = await bcrypt.hash(defaultPassword, 10);
    await knex('users').whereNull('password_hash').update({ password_hash: hash });
};

exports.down = async (knex) => {
    // Not reversible in a meaningful way — leave existing hashes as-is.
};
