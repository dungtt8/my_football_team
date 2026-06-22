const axios = require('axios');
const logger = require('../utils/logger');

class ZaloService {
  constructor() {
    this.oaAccountId = process.env.ZALO_OA_ACCOUNT_ID;
    this.accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
  }

  async sendUtilityMessage(zaloUserId, message) {
    try {
      const response = await axios.post(
        'https://openapi.zalo.me/v3.0/oa/message/send',
        {
          recipient: { user_id: zaloUserId },
          message: { text: message }
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Zalo utility message sent', {
        zalo_user_id: zaloUserId,
        message_length: message.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send Zalo message', {
        zalo_user_id: zaloUserId,
        error: error.message
      });
      throw error;
    }
  }

  async sendZNS(zaloUserId, templateId, templateData) {
    try {
      const response = await axios.post(
        'https://openapi.zalo.me/v3.0/oa/message/zns/send',
        {
          recipient: { user_id: zaloUserId },
          template_id: templateId,
          template_data: templateData
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Zalo ZNS message sent', {
        zalo_user_id: zaloUserId,
        template_id: templateId
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send ZNS message', {
        zalo_user_id: zaloUserId,
        template_id: templateId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new ZaloService();
