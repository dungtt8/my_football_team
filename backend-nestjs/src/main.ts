import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import logger from './common/utils/logger';

// ── Global JSON serialization parity with the Express/knex backend ──────────
// knex + node-postgres returned bigint (int8) and numeric/decimal columns as
// STRINGS. Prisma returns BigInt and Prisma.Decimal objects, so we teach both
// to serialize to strings, keeping the response JSON shape identical for the
// frontend.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Prisma } = require('@prisma/client');
  if (Prisma?.Decimal?.prototype) {
    Prisma.Decimal.prototype.toJSON = function () {
      return this.toString();
    };
  }
} catch {
  // @prisma/client not generated yet (e.g. build-time) — safe to ignore.
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Winston handles application logging; keep Nest's own logger for boot.
    bodyParser: true,
  });

  // ── CORS (mirrors backend/src/app.js) ─────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
  logger.info(`Health check: http://localhost:${port}/health`);
}

bootstrap();
