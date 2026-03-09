import type { Tick } from '../tick';

export const TICK_PUBLISHER = Symbol('ITickPublisher');

export interface ITickPublisher {
  publish(tick: Tick, partitionKey: number): Promise<void>;
}
