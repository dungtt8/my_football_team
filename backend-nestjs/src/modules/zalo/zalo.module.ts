import { Global, Module } from '@nestjs/common';
import { ZaloService } from './zalo.service';
import { ZaloWebhookController } from './zalo-webhook.controller';

@Global()
@Module({
  controllers: [ZaloWebhookController],
  providers: [ZaloService],
  exports: [ZaloService],
})
export class ZaloModule {}
