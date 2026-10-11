import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { MatchPerformanceService } from './match-performance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentTeam } from '../../common/decorators/current-user.decorator';
import { ValidationError } from '../../common/errors/business-errors';

const isNonNegInt = (v: any) => Number.isInteger(v) && v >= 0;

/**
 * Port of backend/src/handlers/matchPerformanceHandler.js.
 */
@Controller('api/attendance/sessions')
export class MatchPerformanceController {
  constructor(private readonly performance: MatchPerformanceService) {}

  @Get(':id/performance')
  @Roles('member', 'co_manager', 'owner')
  async list(@Param('id') id: string, @CurrentTeam() team: any) {
    const performances = await this.performance.getPerformancesForSession(id, team.id);
    return { session_id: id, performances };
  }

  @Post(':id/performance')
  @Roles('member', 'co_manager', 'owner')
  async submit(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { goals, assists } = body;
    if (!isNonNegInt(goals)) throw new ValidationError('goals must be a non-negative integer');
    if (!isNonNegInt(assists)) throw new ValidationError('assists must be a non-negative integer');
    return this.performance.submitOwnPerformance(id, user.id, team.id, { goals, assists });
  }

  @Patch(':id/performance/:userId')
  @Roles('co_manager', 'owner')
  async review(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { goals, assists, status } = body;
    if (goals !== undefined && !isNonNegInt(goals)) {
      throw new ValidationError('goals must be a non-negative integer');
    }
    if (assists !== undefined && !isNonNegInt(assists)) {
      throw new ValidationError('assists must be a non-negative integer');
    }
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw new ValidationError('status must be "approved", "rejected", or "pending"');
    }
    return this.performance.reviewPerformance(id, userId, user.id, team.id, { goals, assists, status });
  }

  @Put(':id/result')
  @Roles('co_manager', 'owner')
  async setResult(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    return this.performance.setMatchResult(id, team.id, user.id, {
      home_score: body.home_score,
      away_score: body.away_score,
    });
  }
}
