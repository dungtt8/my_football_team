import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Health check — no auth required. Mirrors app.js `/health` and index.js
 * `/api/health`.
 */
@Controller()
export class HealthController {
  @Get('health')
  @Public()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('api/health')
  @Public()
  apiHealth() {
    return {
      status: 'success',
      message:
        'API Core của Nền tảng SaaS đang chạy mượt mà dưới dạng Serverless!',
    };
  }
}
