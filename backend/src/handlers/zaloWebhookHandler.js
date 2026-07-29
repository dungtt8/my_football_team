const db = require('../config/database');
const logger = require('../utils/logger');
const zaloService = require('../services/zaloService');
const { consumeCode } = require('../utils/zaloLinkStore');
const { handleError } = require('../services/errorService');

// Zalo Bot API gửi webhook dạng { update_id, message: { chat: { id }, text, from } }
// giống Telegram, khác hoàn toàn format OA cũ ({ event, user_id, message }).
const zaloWebhookHandler = async (req, res) => {
  try {
    const body = req.body;
    logger.info('Zalo bot webhook received', { update_id: body.update_id });

    const chatId = body.message?.chat?.id;
    const text = body.message?.text?.trim();

    if (!chatId || !text) {
      // Không phải tin nhắn text (sticker, ảnh...) — bỏ qua an toàn
      return res.json({ success: true });
    }

    await handleIncomingMessage(chatId, text);

    res.json({ success: true });
  } catch (error) {
    return handleError(error, req, res, { endpoint: '/api/zalo/webhook' });
  }
};

const handleIncomingMessage = async (chatId, text) => {
  const isLinkCode = /^\d{6}$/.test(text);

  if (!isLinkCode) {
    logger.info('Zalo bot received non-link message', { chat_id: chatId });
    return;
  }

  const userId = consumeCode(text);

  if (!userId) {
    await zaloService.sendMessage(chatId, '⚠️ Mã không hợp lệ hoặc đã hết hạn. Vui lòng lấy mã mới trong app.');
    return;
  }

  await db('users').where('id', userId).update({ zalo_user_id: chatId });

  logger.info('User linked Zalo bot chat_id', { user_id: userId, chat_id: chatId });

  await zaloService.sendMessage(chatId, '✅ Đã liên kết thành công! Bạn sẽ nhận thông báo quỹ và điểm danh tại đây.');
};

module.exports = zaloWebhookHandler;