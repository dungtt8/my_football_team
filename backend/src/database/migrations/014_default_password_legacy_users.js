// Set a shared default password for users created before password auth existed
// (password_hash IS NULL). They should change it after logging in.
// Set via LEGACY_DEFAULT_PASSWORD env var when running this migration — never
// hardcode the actual password in source control.
//
// Skips (does not fail) when the env var is absent, since migrations run
// unattended in CI/CD on every deploy — a hard failure here would permanently
// block the pipeline until re-run manually with the var set.
const bcrypt = require('bcryptjs');

exports.up = async (knex) => {
    const defaultPassword = process.env.LEGACY_DEFAULT_PASSWORD;
    if (!defaultPassword) {
        console.warn('[014_default_password_legacy_users] LEGACY_DEFAULT_PASSWORD not set — skipping backfill. Re-run this migration manually with the env var set to apply it.');
        return;
    }
    const hash = await bcrypt.hash(defaultPassword, 10);
    await knex('users').whereNull('password_hash').update({ password_hash: hash });
};

exports.down = async (knex) => {
    // Not reversible in a meaningful way — leave existing hashes as-is.
};
