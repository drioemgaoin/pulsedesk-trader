import { Injectable } from '@nestjs/common';
import type { ITickStore } from '../../domain/ports/tick-store.port';
import type { Tick } from '../../domain/tick';

@Injectable()
export class InMemoryTickStore implements ITickStore {
  private readonly store = new Map<string, Tick>();

  upsert(tick: Tick): void {
    this.store.set(tick.symbol, tick);
  }

  getAll(): Tick[] {
    return Array.from(this.store.values());
  }

  get(symbol: string): Tick | undefined {
    return this.store.get(symbol);
  }

  size(): number {
    return this.store.size;
  }
}
