import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { ZaloModule } from './modules/zalo/zalo.module';
import { NotificationModule } from './modules/notification/notification.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamModule } from './modules/team/team.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { TasksModule } from './modules/schedule/tasks.module';
import { HealthController } from './modules/health/health.controller';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenancyGuard } from './common/guards/tenancy.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    ZaloModule,
    NotificationModule,
    StorageModule,
    AuthModule,
    TeamModule,
    FinanceModule,
    AttendanceModule,
    CampaignModule,
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guards — run in this order (auth -> tenancy -> rbac), mirroring
    // the Express middleware chain in backend/src/app.js.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenancyGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
