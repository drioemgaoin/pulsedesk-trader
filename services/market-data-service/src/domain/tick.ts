import type { MarketTickEvent } from '@pulsedesk/contracts';

export class TickValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TickValidationError';
  }
}

export class Tick {
  readonly symbol: string;
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
  readonly volume: number;
  readonly timestamp: string;

  private constructor(
    symbol: string,
    bid: number,
    ask: number,
    last: number,
    volume: number,
    timestamp: string,
  ) {
    this.symbol = symbol;
    this.bid = bid;
    this.ask = ask;
    this.last = last;
    this.volume = volume;
    this.timestamp = timestamp;
  }

  static create(raw: unknown): Tick {
    if (raw === null || typeof raw !== 'object') {
      throw new TickValidationError('tick must be an object');
    }
    const r = raw as Record<string, unknown>;

    const symbol = r['symbol'];
    if (typeof symbol !== 'string' || symbol.trim() === '') {
      throw new TickValidationError('symbol must be a non-empty string');
    }

    for (const field of ['bid', 'ask', 'last', 'volume'] as const) {
      const val = r[field];
      if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
        throw new TickValidationError(
          `${field} must be a non-negative finite number`,
        );
      }
    }

    const bid = r['bid'] as number;
    const ask = r['ask'] as number;
    if (bid > ask) {
      throw new TickValidationError('bid must not exceed ask');
    }

    const ts = r['timestamp'] ?? new Date().toISOString();
    if (typeof ts !== 'string') {
      throw new TickValidationError('timestamp must be a string');
    }

    return new Tick(
      (symbol as string).toUpperCase().trim(),
      bid,
      ask,
      r['last'] as number,
      r['volume'] as number,
      ts as string,
    );
  }

  toMarketEvent(): MarketTickEvent {
    return {
      eventType: 'market.tick',
      schemaVersion: 1,
      symbol: this.symbol,
      bid: this.bid,
      ask: this.ask,
      last: this.last,
      volume: this.volume,
      timestamp: this.timestamp,
    };
  }
}
