/**
 * Migration 011: Add team fund information
 * Adds bank account, bank name, and QR code image for fund payments
 */
exports.up = async (knex) => {
    const [hasAccount, hasBank, hasQr] = await Promise.all([
        knex.schema.hasColumn('teams', 'bank_account_number'),
        knex.schema.hasColumn('teams', 'bank_name'),
        knex.schema.hasColumn('teams', 'fund_qr_code_url'),
    ]);
    await knex.schema.table('teams', (table) => {
        if (!hasAccount) table.string('bank_account_number', 50).nullable().comment('Bank account number for payments');
        if (!hasBank) table.string('bank_name', 100).nullable().comment('Bank name (e.g., Vietcombank, Techcombank)');
        if (!hasQr) table.string('fund_qr_code_url', 500).nullable().comment('URL to QR code image for fund payments');
    });
};

exports.down = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.dropColumn('bank_account_number');
        table.dropColumn('bank_name');
        table.dropColumn('fund_qr_code_url');
    });
};
