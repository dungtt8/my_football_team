// Lưu mã liên kết tạm thời trong RAM — không cần sửa database.
// Lưu ý: nếu chạy nhiều instance backend song song (serverless/production),
// Map này KHÔNG dùng chung được giữa các instance — cần chuyển sang Redis
// hoặc 1 cột riêng trong bảng users khi lên production thật.
const linkCodes = new Map(); // code -> { userId, expiresAt }

const CODE_TTL_MS = 10 * 60 * 1000; // 10 phút

function generateCode(userId) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  linkCodes.set(code, { userId, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

function consumeCode(code) {
  const entry = linkCodes.get(code);
  linkCodes.delete(code); // dùng 1 lần, xoá ngay dù hợp lệ hay không
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.userId;
}

module.exports = { generateCode, consumeCode };