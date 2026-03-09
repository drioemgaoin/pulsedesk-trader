import { Injectable } from '@nestjs/common';
import type { ITickMetrics } from '../../application/ports/metrics.port';

@Injectable()
export class TickMetricsService implements ITickMetrics {
  private _emitted = 0;
  private _rejected = 0;
  private readonly startMs: number = this.now();

  protected now(): number {
    return Date.now();
  }

  incrementEmitted(): void {
    this._emitted++;
  }

  incrementRejected(): void {
    this._rejected++;
  }

  get emitted(): number {
    return this._emitted;
  }

  get rejected(): number {
    return this._rejected;
  }

  get ticksPerSecond(): number {
    const elapsedS = (this.now() - this.startMs) / 1000;
    if (elapsedS <= 0) return 0;
    return this._emitted / elapsedS;
  }

  toPrometheusText(): string {
    return [
      '# HELP market_tick_emitted_total Total ticks emitted by simulator',
      '# TYPE market_tick_emitted_total counter',
      `market_tick_emitted_total ${this._emitted}`,
      '# HELP market_tick_rejected_total Total ticks rejected due to validation failure',
      '# TYPE market_tick_rejected_total counter',
      `market_tick_rejected_total ${this._rejected}`,
      '# HELP market_tick_rate_per_second Current average tick emission rate',
      '# TYPE market_tick_rate_per_second gauge',
      `market_tick_rate_per_second ${this.ticksPerSecond.toFixed(2)}`,
      '',
    ].join('\n');
  }
}
