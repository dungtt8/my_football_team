const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');
const zaloService = require('../services/zaloService');
const checkinService = require('../services/checkinService');
const { consumeCode } = require('../utils/zaloLinkStore');
const { handleError } = require('../services/errorService');

function isValidSecret(secretHeader) {
  const expected = process.env.ZALO_WEBHOOK_SECRET;
  if (!expected || !secretHeader) return false;

  const expectedBuf = Buffer.from(expected);
  const headerBuf = Buffer.from(secretHeader);
  if (expectedBuf.length !== headerBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, headerBuf);
}

const zaloWebhookHandler = async (req, res) => {
  try {
    const secretHeader = req.headers['x-bot-api-secret-token'];
    if (!isValidSecret(secretHeader)) {
      logger.warn('Zalo webhook rejected — invalid secret token');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const body = req.body;
    logger.info('Zalo bot webhook received', { update_id: body.update_id });

    const chatId = body.message?.chat?.id;
    const text = body.message?.text?.trim();

    if (!chatId || !text) {
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

  if (isLinkCode) {
    const userId = await consumeCode(text);
    if (!userId) {
      await zaloService.sendMessage(chatId, 'Mã không hợp lệ hoặc đã hết hạn. Vui lòng lấy mã mới trong app.');
      return;
    }
    await db('users').where('id', userId).update({ zalo_user_id: chatId });
    logger.info('User linked Zalo bot chat_id', { user_id: userId, chat_id: chatId });
    await zaloService.sendMessage(chatId, 'ĐÃ LIÊN KẾT THÀNH CÔNG! Bạn sẽ nhận thông báo quỹ và điểm danh tại đây.');
    return;
  }

  if (text === '1' || text === '2') {
    return handleCheckinResponse(chatId, text === '1' ? 'yes' : 'no');
  }

  logger.info('Zalo bot received unrecognized message', { chat_id: chatId, text });
  await zaloService.sendMessage(chatId, 'Không hiểu tin nhắn này. Trả lời "1" (tham gia) hoặc "2" (không tham gia) cho buổi tập gần nhất, hoặc nhắn mã liên kết 6 số.');
};

const handleCheckinResponse = async (chatId, response) => {
  const user = await db('users').where('zalo_user_id', chatId).first();
  if (!user) {
    await zaloService.sendMessage(chatId, 'Tài khoản chưa liên kết. Vào app để lấy mã liên kết trước.');
    return;
  }

  const userTeams = await db('team_members')
    .where({ user_id: user.id, status: 'active' })
    .select('team_id');

  let activeCheckin = null;
  for (const { team_id } of userTeams) {
    const checkin = await checkinService.getActiveCheckinForUser(team_id, user.id);
    if (checkin) {
      activeCheckin = checkin;
      break;
    }
  }

  if (!activeCheckin) {
    await zaloService.sendMessage(chatId, 'Hiện không có buổi tập nào cần điểm danh.');
    return;
  }

  try {
    await checkinService.respondToCheckin(activeCheckin.id, user.id, response);
    await zaloService.sendMessage(chatId, response === 'yes' ? 'Đã ghi nhận: Có mặt!' : 'Đã ghi nhận: Vắng mặt.');
  } catch (error) {
    logger.error('Failed to respond to checkin via Zalo', { user_id: user.id, error: error.message });
    await zaloService.sendMessage(chatId, 'Có lỗi xảy ra (buổi tập có thể đã đóng), vui lòng kiểm tra lại trong app.');
  }
};

module.exports = zaloWebhookHandler;