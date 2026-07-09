import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** Mirrors rbacMiddleware(['owner', ...]) from the Express app. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
