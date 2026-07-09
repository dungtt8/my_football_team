import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Builds a Postgres connection string for Prisma from either an explicit
 * DATABASE_URL or the individual DB_* env vars used by the Express backend.
 * Respects DB_SSL=true by appending sslmode=require (Supabase uses a
 * self-signed-ish chain; the Express backend used rejectUnauthorized:false).
 */
export function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const password = encodeURIComponent(process.env.DB_PASSWORD || '');
  const database = process.env.DB_NAME || 'postgres';
  const ssl = process.env.DB_SSL === 'true';

  let url = `postgresql://${user}:${password}@${host}:${port}/${database}`;
  const params: string[] = [];
  if (ssl) {
    // sslmode=no-verify mirrors the old { rejectUnauthorized: false } behaviour.
    params.push('sslmode=no-verify');
  }
  params.push('connection_limit=10');
  if (params.length) url += `?${params.join('&')}`;
  return url;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: { db: { url: buildDatabaseUrl() } },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Typed raw-query helper. Kept as its own method (rather than calling
   * `$queryRawUnsafe<T>` directly at each call site) so the code compiles both
   * against the real generated client and against the un-generated stub (where
   * `PrismaClient` is typed as `any` and cannot accept type arguments).
   */
  raw<T = any>(sql: string, ...params: any[]): Promise<T> {
    return (this as any).$queryRawUnsafe(sql, ...params);
  }
}
