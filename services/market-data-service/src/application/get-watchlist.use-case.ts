import { Inject, Injectable } from '@nestjs/common';
import type { WatchlistResponseV1 } from '@pulsedesk/contracts';
import { ITickStore, TICK_STORE } from '../domain/ports/tick-store.port';

@Injectable()
export class GetWatchlistUseCase {
  constructor(@Inject(TICK_STORE) private readonly store: ITickStore) {}

  execute(symbols?: string[]): WatchlistResponseV1 {
    const quotes = this.store.getAll().map((t) => ({
      symbol: t.symbol,
      bid: t.bid,
      ask: t.ask,
      last: t.last,
      volume: t.volume,
      timestamp: t.timestamp,
    }));
    const filtered =
      symbols && symbols.length > 0
        ? quotes.filter((q) => symbols.includes(q.symbol))
        : quotes;
    return { quotes: filtered, asOf: new Date().toISOString() };
  }
}
