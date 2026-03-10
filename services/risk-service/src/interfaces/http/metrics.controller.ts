import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { RiskMetricsService } from '../../infrastructure/metrics/risk-metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: RiskMetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint()
  async getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }
}
