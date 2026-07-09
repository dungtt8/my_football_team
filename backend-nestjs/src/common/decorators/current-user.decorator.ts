import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Provides the request user object attached by JwtAuthGuard.
 * Shape matches the Express `req.user`: the decoded JWT plus a normalized
 * `id` (id ?? user_id).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/** Provides the team context attached by TenancyGuard (`req.team`). */
export const CurrentTeam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.team;
  },
);
