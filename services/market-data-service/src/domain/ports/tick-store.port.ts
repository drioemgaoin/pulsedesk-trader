import type { Tick } from '../tick';

export const TICK_STORE = Symbol('ITickStore');

export interface ITickStore {
  upsert(tick: Tick): void;
  getAll(): Tick[];
  get(symbol: string): Tick | undefined;
  size(): number;
}
