import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../../modules/auth/auth.service';

/**
 * Port of backend/src/middleware/authMiddleware.js.
 * Verifies the Bearer JWT and attaches `req.user` (decoded + normalized id)
 * and `req.teamId`. Skipped on @Public() routes.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new HttpException({ error: 'Missing authentication token' }, 401);
    }

    try {
      const decoded = this.authService.verifyJWT(token);
      req.user = {
        ...decoded,
        id: decoded.id ?? decoded.user_id,
      };
      req.teamId = decoded.team_id;
      return true;
    } catch (error) {
      throw new HttpException({ error: 'Invalid or expired token' }, 401);
    }
  }
}
