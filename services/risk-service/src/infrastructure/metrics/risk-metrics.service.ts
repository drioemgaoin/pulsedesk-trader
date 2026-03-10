import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';
import { IRiskMetrics } from '../../domain/ports/risk-metrics.port';

@Injectable()
export class RiskMetricsService implements IRiskMetrics {
  readonly registry: Registry;
  private readonly evaluationTotal: Counter;
  private readonly evaluationLatency: Histogram;

  constructor() {
    this.registry = new Registry();

    this.evaluationTotal = new Counter({
      name: 'risk_evaluation_total',
      help: 'Total number of risk evaluations by outcome',
      labelNames: ['outcome'],
      registers: [this.registry],
    });

    this.evaluationLatency = new Histogram({
      name: 'risk_evaluation_latency_ms',
      help: 'Risk evaluation latency in milliseconds',
      buckets: [1, 2, 5, 10, 25, 50, 100],
      registers: [this.registry],
    });
  }

  recordEvaluation(outcome: string, latencyMs: number): void {
    this.evaluationTotal.inc({ outcome });
    this.evaluationLatency.observe(latencyMs);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
