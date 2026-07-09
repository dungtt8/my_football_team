import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
} from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentTeam } from '../../common/decorators/current-user.decorator';
import {
  NotFoundError,
  ValidationError,
} from '../../common/errors/business-errors';

/**
 * Port of backend/src/handlers/checkinHandler.js.
 */
@Controller('api/attendance')
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Get('checkin/active')
  @Roles('member', 'co_manager', 'owner')
  async getActiveCheckIn(@CurrentUser() user: any, @CurrentTeam() team: any) {
    const userId = user?.id;
    const teamId = team?.id || user?.team_id;
    if (!userId || !teamId) {
      throw new HttpException({ error: 'Unauthorized' }, 401);
    }
    const checkin = await this.checkin.getActiveCheckinForUser(teamId, userId);
    return { check_in: checkin };
  }

  @Post('checkin/:checkInId/respond')
  @Roles('member', 'co_manager', 'owner')
  @HttpCode(200)
  async respondToCheckIn(
    @Param('checkInId') checkInId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id;
    if (!userId) throw new HttpException({ error: 'Unauthorized' }, 401);
    if (!['yes', 'no'].includes(body.response)) {
      throw new ValidationError('Response must be "yes" or "no"');
    }
    const result = await this.checkin.respondToCheckin(
      checkInId,
      userId,
      body.response,
    );
    return { success: true, check_in: result };
  }

  @Get('sessions/:sessionId/checkin-stats')
  @Roles('co_manager', 'owner')
  async getCheckInStats(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const teamId = team?.id || user?.team_id;
    if (!teamId) throw new HttpException({ error: 'Unauthorized' }, 401);

    const stats = await this.checkin.getSessionStats(sessionId, teamId);
    if (!stats) throw new NotFoundError('Session', sessionId);

    const checkins = await this.checkin.getSessionCheckins(sessionId, teamId);
    return { session_id: sessionId, stats, checkins };
  }
}
