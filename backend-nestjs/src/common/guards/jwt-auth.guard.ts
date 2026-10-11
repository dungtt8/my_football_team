import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../../modules/auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { bi } from '../utils/helpers';

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
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    let decoded: any;
    try {
      decoded = this.authService.verifyJWT(token);
    } catch (error) {
      throw new HttpException({ error: 'Invalid or expired token' }, 401);
    }
    const userId = decoded.id ?? decoded.user_id;

    // JWT role/team_id claims go stale after login. Re-check live membership
    // on every request so a demoted or removed member loses access at once.
    if (decoded.team_id) {
      const membership = await this.prisma.team_members.findFirst({
        where: {
          team_id: bi(decoded.team_id),
          user_id: bi(userId),
          deleted_at: null,
        },
      });
      if (!membership || membership.status !== 'active') {
        throw new HttpException({ error: 'Membership is no longer active' }, 401);
      }
      decoded.role = membership.role;
    }

    req.user = { ...decoded, id: userId };
    req.teamId = decoded.team_id;
    return true;
  }
}
