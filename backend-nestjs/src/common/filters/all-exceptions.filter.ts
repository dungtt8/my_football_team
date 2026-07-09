import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessError } from '../errors/business-errors';
import logger from '../utils/logger';

/**
 * Mirrors backend/src/services/errorService.js `handleError`:
 *  - BusinessError -> its statusCode + { error, code, details? }  (warn log)
 *  - HttpException (used by guards for the exact {error} shape) -> pass through
 *  - anything else -> 500 { error: 'Internal server error', code: 'INTERNAL_ERROR' } (error log)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const user: any = (req as any).user;
    const context = {
      team_id: user?.team_id,
      user_id: user?.user_id,
      path: req.path,
    };

    if (exception instanceof BusinessError) {
      logger.warn(`Business error: ${exception.code}`, {
        code: exception.code,
        message: exception.message,
        statusCode: exception.statusCode,
        ...context,
      });
      res.status(exception.statusCode).json({
        error: exception.message,
        code: exception.code,
        details: exception.details || undefined,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (body && typeof body === 'object') {
        res.status(status).json(body);
      } else {
        res.status(status).json({ error: body });
      }
      return;
    }

    logger.error('Unhandled error', {
      message: (exception as any)?.message,
      stack: (exception as any)?.stack,
      ...context,
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
