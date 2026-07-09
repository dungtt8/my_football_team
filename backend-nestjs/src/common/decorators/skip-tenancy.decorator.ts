import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as auth-only: JWT required, but NO tenancy (team context) guard.
 * Mirrors the Express routes mounted between `app.use(authMiddleware)` and
 * `app.use(tenancyMiddleware)` in backend/src/app.js.
 */
export const SKIP_TENANCY_KEY = 'skipTenancy';
export const SkipTenancy = () => SetMetadata(SKIP_TENANCY_KEY, true);
