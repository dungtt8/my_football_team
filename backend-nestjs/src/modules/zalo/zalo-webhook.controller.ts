import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  Post,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ZaloService } from './zalo.service';
import { ZaloLinkService } from './zalo-link.service';
import { CheckinService } from '../attendance/checkin.service';
import { Public } from '../../common/decorators/public.decorator';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/handlers/zaloWebhookHandler.js (Zalo Bot webhook).
 * Unauthenticated — verifies the shared secret header before processing.
 */
@Controller('api/zalo')
export class ZaloWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zalo: ZaloService,
    private readonly links: ZaloLinkService,
    private readonly checkin: CheckinService,
  ) {}

  private isValidSecret(header: string | undefined): boolean {
    const expected = process.env.ZALO_WEBHOOK_SECRET;
    if (!expected || !header) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-bot-api-secret-token') secret: string,
  ) {
    if (!this.isValidSecret(secret)) {
      logger.warn('Zalo webhook rejected — invalid secret token');
      throw new HttpException({ error: 'Forbidden' }, 403);
    }

    logger.info('Zalo bot webhook received', { update_id: body?.update_id });

    const chatId = body?.message?.chat?.id;
    const text = body?.message?.text?.trim();
    if (!chatId || !text) return { success: true };

    await this.handleIncomingMessage(chatId, text);
    return { success: true };
  }

  private async handleIncomingMessage(chatId: string, text: string) {
    if (/^\d{6}$/.test(text)) {
      const userId = await this.links.consumeCode(text);
      if (!userId) {
        await this.zalo.sendMessage(
          chatId,
          'Mã không hợp lệ hoặc đã hết hạn. Vui lòng lấy mã mới trong app.',
        );
        return;
      }
      await this.prisma.users.update({
        where: { id: userId },
        data: { zalo_user_id: chatId },
      });
      logger.info('User linked Zalo bot chat_id', { user_id: userId, chat_id: chatId });
      await this.zalo.sendMessage(
        chatId,
        'ĐÃ LIÊN KẾT THÀNH CÔNG! Bạn sẽ nhận thông báo quỹ và điểm danh tại đây.',
      );
      return;
    }

    if (text === '1' || text === '2') {
      return this.handleCheckinResponse(chatId, text === '1' ? 'yes' : 'no');
    }

    logger.info('Zalo bot received unrecognized message', { chat_id: chatId, text });
    await this.zalo.sendMessage(
      chatId,
      'Không hiểu tin nhắn này. Trả lời "1" (tham gia) hoặc "2" (không tham gia) cho buổi tập gần nhất, hoặc nhắn mã liên kết 6 số.',
    );
  }

  private async handleCheckinResponse(chatId: string, response: 'yes' | 'no') {
    const user = await this.prisma.users.findFirst({
      where: { zalo_user_id: chatId },
    });
    if (!user) {
      await this.zalo.sendMessage(
        chatId,
        'Tài khoản chưa liên kết. Vào app để lấy mã liên kết trước.',
      );
      return;
    }

    const userTeams = await this.prisma.team_members.findMany({
      where: { user_id: user.id, status: 'active' },
      select: { team_id: true },
    });

    let activeCheckin: any = null;
    for (const { team_id } of userTeams) {
      const c = await this.checkin.getActiveCheckinForUser(team_id, user.id);
      if (c) {
        activeCheckin = c;
        break;
      }
    }
    if (!activeCheckin) {
      await this.zalo.sendMessage(chatId, 'Hiện không có buổi tập nào cần điểm danh.');
      return;
    }

    try {
      await this.checkin.respondToCheckin(activeCheckin.id, user.id, response);
      await this.zalo.sendMessage(
        chatId,
        response === 'yes' ? 'Đã ghi nhận: Có mặt!' : 'Đã ghi nhận: Vắng mặt.',
      );
    } catch (error: any) {
      logger.error('Failed to respond to checkin via Zalo', {
        user_id: user.id,
        error: error.message,
      });
      await this.zalo.sendMessage(
        chatId,
        'Có lỗi xảy ra (buổi tập có thể đã đóng), vui lòng kiểm tra lại trong app.',
      );
    }
  }
}
