/**
 * Migration 007: Add bill_image_url to campaign_assignments
 * Member cần upload ảnh minh chứng khi xác nhận đã đóng tiền
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('campaign_assignments', (table) => {
        table.string('bill_image_url', 500).nullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('campaign_assignments', (table) => {
        table.dropColumn('bill_image_url');
    });
};
