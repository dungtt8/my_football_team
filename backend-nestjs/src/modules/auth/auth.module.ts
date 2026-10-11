import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordResetController } from './password-reset.controller';
import { TeamModule } from '../team/team.module';

@Global()
@Module({
  imports: [TeamModule],
  controllers: [AuthController, PasswordResetController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
