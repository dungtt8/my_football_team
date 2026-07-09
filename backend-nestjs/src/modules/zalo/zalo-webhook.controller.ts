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
import { Public } from '../../common/decorators/public.decorator';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/handlers/zaloWebhookHandler.js.
 * Unauthenticated — verifies the Zalo signature before processing.
 */
@Controller('api/zalo')
export class ZaloWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  private verifyZaloSignature(body: any, signature: string | undefined): boolean {
    const verifyToken = process.env.ZALO_OA_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      logger.error(
        'ZALO_OA_WEBHOOK_VERIFY_TOKEN is not configured; rejecting webhook request',
      );
      return false;
    }
    if (!signature || typeof signature !== 'string') return false;

    const hash = crypto
      .createHmac('sha256', verifyToken)
      .update(JSON.stringify(body))
      .digest('hex');

    const hashBuffer = Buffer.from(hash);
    const signatureBuffer = Buffer.from(signature);
    if (hashBuffer.length !== signatureBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, signatureBuffer);
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-zalo-signature') signature: string,
  ) {
    if (!this.verifyZaloSignature(body, signature)) {
      logger.warn('Invalid Zalo webhook signature');
      throw new HttpException({ error: 'Invalid signature' }, 403);
    }

    logger.info('Zalo webhook received', { event: body.event });

    switch (body.event) {
      case 'follow':
        await this.handleFollowEvent(body);
        break;
      case 'unfollow':
        logger.info('User unfollowed OA', { zalo_user_id: body.user_id });
        break;
      case 'message':
        logger.info('Message received from user', {
          zalo_user_id: body.user_id,
          message_length: body.message?.text?.length,
        });
        break;
      case 'view':
        logger.info('User viewed OA', { zalo_user_id: body.user_id });
        break;
      default:
        logger.warn('Unknown Zalo event type', { event: body.event });
    }

    return { success: true };
  }

  private async handleFollowEvent(event: any): Promise<void> {
    const zaloUserId = event.user_id;
    logger.info('User followed OA', { zalo_user_id: zaloUserId });
    const user = await this.prisma.users.findFirst({
      where: { zalo_user_id: zaloUserId },
    });
    if (!user) {
      logger.info('New follower detected', { zalo_user_id: zaloUserId });
    }
  }
}
