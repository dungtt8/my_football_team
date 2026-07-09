import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [NestScheduleModule.forRoot(), AttendanceModule, FinanceModule],
  providers: [TasksService],
})
export class TasksModule {}
