exports.up = async (knex) => {
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
