import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { CheckinController } from './checkin.controller';
import { GamificationService } from './gamification.service';
import { CheckinService } from './checkin.service';
import { SessionSchedulingService } from './session-scheduling.service';

@Module({
  controllers: [AttendanceController, CheckinController],
  providers: [GamificationService, CheckinService, SessionSchedulingService],
  exports: [GamificationService, CheckinService, SessionSchedulingService],
})
export class AttendanceModule {}
