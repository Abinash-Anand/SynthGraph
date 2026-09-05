import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'synthgraph-backend',
      mode: 'mock',
      timestamp: new Date().toISOString(),
    };
  }
}