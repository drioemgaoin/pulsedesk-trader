import { Inject, Injectable } from '@nestjs/common';
import { symbolPartitionKey } from '../domain/partition-key';
import { ITickPublisher, TICK_PUBLISHER } from '../domain/ports/tick-publisher.port';
import { ITickStore, TICK_STORE } from '../domain/ports/tick-store.port';
import type { Tick } from '../domain/tick';
import { ITickMetrics, TICK_METRICS } from './ports/metrics.port';

const KAFKA_PARTITIONS = 10;

@Injectable()
export class ProcessTickUseCase {
  constructor(
    @Inject(TICK_STORE) private readonly store: ITickStore,
    @Inject(TICK_PUBLISHER) private readonly publisher: ITickPublisher,
    @Inject(TICK_METRICS) private readonly metrics: ITickMetrics,
  ) {}

  async execute(tick: Tick): Promise<void> {
    this.store.upsert(tick);
    await this.publisher.publish(tick, symbolPartitionKey(tick.symbol, KAFKA_PARTITIONS));
    this.metrics.incrementEmitted();
  }
}
