import { Global, Module } from '@nestjs/common';
import { TeamUsersService } from './services/team-users.service';

@Global()
@Module({
  providers: [TeamUsersService],
  exports: [TeamUsersService],
})
export class CommonModule {}
