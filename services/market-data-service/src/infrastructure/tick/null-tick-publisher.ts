import { Injectable } from '@nestjs/common';
import type { ITickPublisher } from '../../domain/ports/tick-publisher.port';
import type { Tick } from '../../domain/tick';

/**
 * No-op publisher used in T2.
 * Replaced by KafkaTickPublisher in T3.
 */
@Injectable()
export class NullTickPublisher implements ITickPublisher {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async publish(_tick: Tick, _partitionKey: number): Promise<void> {
    // T3: replace with KafkaJS producer
  }
}
