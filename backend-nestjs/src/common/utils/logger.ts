import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        )
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
  }),
];

// File transports only in non-serverless / non-production environments
if (!isProduction) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'football-backend' },
  transports,
});

export default logger;
