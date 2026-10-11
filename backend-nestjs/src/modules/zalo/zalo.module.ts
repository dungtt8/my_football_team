import { Global, Module } from '@nestjs/common';
import { ZaloService } from './zalo.service';
import { ZaloLinkService } from './zalo-link.service';
import { ZaloWebhookController } from './zalo-webhook.controller';
import { AttendanceModule } from '../attendance/attendance.module';

@Global()
@Module({
  imports: [AttendanceModule],
  controllers: [ZaloWebhookController],
  providers: [ZaloService, ZaloLinkService],
  exports: [ZaloService, ZaloLinkService],
})
export class ZaloModule {}
