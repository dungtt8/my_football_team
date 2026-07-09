import { SetMetadata } from '@nestjs/common';

/** Marks a route as unauthenticated (no JWT guard, no tenancy). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
