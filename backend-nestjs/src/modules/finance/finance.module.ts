import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { ApprovalService } from './approval.service';
import { FinanceClosingService } from './finance-closing.service';

@Module({
  controllers: [FinanceController],
  providers: [ApprovalService, FinanceClosingService],
  exports: [ApprovalService, FinanceClosingService],
})
export class FinanceModule {}
