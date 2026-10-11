import { Injectable } from '@nestjs/common';
import axios from 'axios';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/services/zaloService.js (Zalo Bot API).
 * `zalo_user_id` stored on users is the bot chat_id.
 */
@Injectable()
export class ZaloService {
  private get baseUrl() {
    // Token has the form "botId:accessToken" from bot.zapps.me
    return `https://bot-api.zaloplatforms.com/bot${process.env.ZALO_BOT_TOKEN}`;
  }

  constructor() {
    if (!process.env.ZALO_BOT_TOKEN) {
      logger.error('ZALO_BOT_TOKEN is not set — Zalo bot messages will fail');
    }
  }

  async sendMessage(chatId: string, text: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text,
      });
      // Zalo can return HTTP 200 with { ok: false } on failure.
      if (response.data && response.data.ok === false) {
        logger.error('Zalo bot API rejected sendMessage', {
          chat_id: chatId,
          response: response.data,
        });
        throw new Error(
          `Zalo sendMessage failed: ${response.data.description || 'unknown error'}`,
        );
      }
      logger.info('Zalo bot message sent', {
        chat_id: chatId,
        message_length: text.length,
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to send Zalo bot message', {
        chat_id: chatId,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  /** Kept for existing callers (scheduled tasks). */
  sendUtilityMessage(chatId: string, message: string): Promise<any> {
    return this.sendMessage(chatId, message);
  }
}
