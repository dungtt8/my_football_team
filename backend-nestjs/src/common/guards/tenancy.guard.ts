import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_TENANCY_KEY } from '../decorators/skip-tenancy.decorator';

/**
 * Port of backend/src/middleware/tenancyMiddleware.js.
 * Requires `req.user.team_id` and attaches `req.team = { id }`.
 * Skipped on @Public() and @SkipTenancy() routes (mirrors the Express mount
 * ordering where some auth-only routes precede app.use(tenancyMiddleware)).
 */
@Injectable()
export class TenancyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipTenancy = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANCY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipTenancy) return true;

    const req = context.switchToHttp().getRequest();
    if (!req.user || !req.user.team_id) {
      throw new HttpException({ error: 'Missing team context' }, 403);
    }

    req.team = { id: req.user.team_id };
    return true;
  }
}
