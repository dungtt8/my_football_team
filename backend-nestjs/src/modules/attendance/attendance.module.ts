import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { CheckinController } from './checkin.controller';
import { GamificationService } from './gamification.service';
import { CheckinService } from './checkin.service';
import { MatchPerformanceController } from './match-performance.controller';
import { MatchPerformanceService } from './match-performance.service';
import { SessionSchedulingService } from './session-scheduling.service';

@Module({
  controllers: [AttendanceController, CheckinController, MatchPerformanceController],
  providers: [GamificationService, CheckinService, SessionSchedulingService, MatchPerformanceService],
  exports: [GamificationService, CheckinService, SessionSchedulingService],
})
export class AttendanceModule {}
