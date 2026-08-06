// Lưu mã liên kết Zalo trong bảng zalo_link_codes (DB) để dùng chung được
// giữa nhiều instance backend (serverless/production) và không mất khi restart.
const db = require('../config/database');

const CODE_TTL_MS = 10 * 60 * 1000; // 10 phút

async function generateCode(userId) {
    let code;
    let inserted = false;
    while (!inserted) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await db('zalo_link_codes').where('code', code).first();
        if (existing) continue;
        await db('zalo_link_codes').insert({
            code,
            user_id: userId,
            expires_at: new Date(Date.now() + CODE_TTL_MS)
        });
        inserted = true;
    }
    return code;
}

async function consumeCode(code) {
    const entry = await db('zalo_link_codes').where('code', code).first();
    if (entry) {
        await db('zalo_link_codes').where('code', code).del(); // dùng 1 lần, xoá ngay dù hợp lệ hay không
    }
    if (!entry || new Date(entry.expires_at).getTime() < Date.now()) {
        return null;
    }
    return entry.user_id;
}

module.exports = { generateCode, consumeCode };
