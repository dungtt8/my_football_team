/**
 * Migration 008: Add campaign_type to campaigns, team_fund_amount to teams
 * - campaigns.campaign_type: 'team_fund' (định kỳ, hệ thống tự tạo) | 'ad_hoc' (bất thường, manager tạo)
 * - teams.team_fund_amount: số tiền quỹ định kỳ mỗi member mỗi tháng
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('campaigns', (table) => {
        table.string('campaign_type', 50).notNullable().defaultTo('ad_hoc'); // 'team_fund' | 'ad_hoc'
        table.string('fund_month', 7).nullable(); // YYYY-MM — dùng cho team_fund để tránh tạo trùng
        table.index(['team_id', 'campaign_type', 'fund_month']);
    });

    await knex.schema.alterTable('teams', (table) => {
        table.decimal('team_fund_amount', 12, 2).nullable(); // Số tiền quỹ định kỳ mỗi member/tháng
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('campaigns', (table) => {
        table.dropIndex(['team_id', 'campaign_type', 'fund_month']);
        table.dropColumn('fund_month');
        table.dropColumn('campaign_type');
    });

    await knex.schema.alterTable('teams', (table) => {
        table.dropColumn('team_fund_amount');
    });
};
