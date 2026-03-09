import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { TickMetricsService } from '../../infrastructure/metrics/tick-metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly tickMetrics: TickMetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint()
  metrics(): string {
    return this.tickMetrics.toPrometheusText();
  }
}
