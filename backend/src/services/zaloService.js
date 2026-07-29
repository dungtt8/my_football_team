const axios = require('axios');
const logger = require('../utils/logger');

class ZaloService {
  constructor() {
    // Token dạng "botId:accessToken" lấy từ bot.zapps.me
    this.botToken = process.env.ZALO_BOT_TOKEN;
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

      logger.info('Zalo bot message sent', {
        chat_id: chatId,
        message_length: text.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send Zalo bot message', {
        chat_id: chatId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new ZaloService();