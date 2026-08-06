const axios = require('axios');
const logger = require('../utils/logger');

class ZaloService {
  constructor() {
    // Token dạng "botId:accessToken" lấy từ bot.zapps.me
    this.botToken = process.env.ZALO_BOT_TOKEN;
    if (!this.botToken) {
      // Without this, requests silently hit .../botundefined/... and Zalo
      // returns a 404 that looks like a generic API error, not a config issue.
      logger.error('ZALO_BOT_TOKEN is not set — Zalo bot messages will fail');
    }
    this.baseUrl = `https://bot-api.zaloplatforms.com/bot${this.botToken}`;
  }

  /**
   * Gửi tin nhắn text tới 1 chat_id qua Zalo Bot API
   * @param {string} chatId - chat_id lưu trong users.zalo_user_id
   * @param {string} text - nội dung tin nhắn, 1-2000 ký tự
   */
  async sendMessage(chatId, text) {
    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text: text
      });

      // Zalo Bot API can return HTTP 200 with { ok: false, ... } on failure —
      // a 2xx status alone does not mean the message was actually delivered.
      if (response.data && response.data.ok === false) {
        logger.error('Zalo bot API rejected sendMessage', {
          chat_id: chatId,
          response: response.data
        });
        throw new Error(`Zalo sendMessage failed: ${response.data.description || 'unknown error'}`);
      }

      logger.info('Zalo bot message sent', {
        chat_id: chatId,
        message_length: text.length,
        response: response.data
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send Zalo bot message', {
        chat_id: chatId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
}

module.exports = new ZaloService();