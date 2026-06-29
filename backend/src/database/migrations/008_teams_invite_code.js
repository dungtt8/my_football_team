exports.up = async (knex) => {
    // Check if column already exists
    const hasColumn = await knex.schema.hasColumn('teams', 'invite_code');
    if (hasColumn) {
        console.log('✅ invite_code column already exists, skipping...');
        return;
    }

    await knex.schema.alterTable('teams', (table) => {
        table.string('invite_code', 10).unique().nullable();
    });

    // Backfill invite codes for existing teams
    const teams = await knex('teams').select('id');
    for (const team of teams) {
        const code = generateCode();
        await knex('teams').where({ id: team.id }).update({ invite_code: code });
    }
};

exports.down = async (knex) => {
    await knex.schema.alterTable('teams', (table) => {
        table.dropColumn('invite_code');
    });
};

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
    let code = '';
    for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}
