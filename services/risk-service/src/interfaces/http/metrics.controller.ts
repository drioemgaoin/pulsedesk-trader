import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class MetricsController {
  // Placeholder — replaced by Prometheus exporter in T4 (observability task)
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint()
  metrics(): string {
    return '# Prometheus metrics — stub (see T4)\n';
  }
}
