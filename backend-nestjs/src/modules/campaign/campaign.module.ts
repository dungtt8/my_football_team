import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [CampaignController],
})
export class CampaignModule {}
