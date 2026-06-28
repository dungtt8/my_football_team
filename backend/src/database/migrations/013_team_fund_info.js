/**
 * Migration 011: Add team fund information
 * Adds bank account, bank name, and QR code image for fund payments
 */
exports.up = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.string('bank_account_number', 50).nullable().comment('Bank account number for payments');
        table.string('bank_name', 100).nullable().comment('Bank name (e.g., Vietcombank, Techcombank)');
        table.string('fund_qr_code_url', 500).nullable().comment('URL to QR code image for fund payments');
    });
};

exports.down = async (knex) => {
    await knex.schema.table('teams', (table) => {
        table.dropColumn('bank_account_number');
        table.dropColumn('bank_name');
        table.dropColumn('fund_qr_code_url');
    });
};
