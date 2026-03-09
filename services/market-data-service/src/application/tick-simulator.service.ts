import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ProcessTickUseCase } from './process-tick.use-case';
import { NormalizeTickUseCase } from './normalize-tick.use-case';

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
const BASE_PRICES: Record<string, number> = {
  AAPL: 175,
  MSFT: 420,
  GOOGL: 175,
  TSLA: 200,
  NVDA: 850,
};

@Injectable()
export class TickSimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TickSimulatorService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly prices = new Map<string, number>();
  private readonly symbols: string[];
  private readonly intervalMs: number;

  constructor(
    private readonly normalize: NormalizeTickUseCase,
    private readonly processTick: ProcessTickUseCase,
  ) {
    const raw = process.env['MARKET_DATA_SYMBOLS'] ?? DEFAULT_SYMBOLS.join(',');
    this.symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    this.intervalMs = parseInt(
      process.env['MARKET_DATA_TICK_INTERVAL_MS'] ?? '500',
      10,
    );
  }

  onModuleInit(): void {
    for (const symbol of this.symbols) {
      this.prices.set(symbol, BASE_PRICES[symbol] ?? 100);
    }
    this.timer = setInterval(() => void this.emitBatch(), this.intervalMs);
    this.logger.log(
      `tick simulator started — symbols=${this.symbols.join(',')} interval=${this.intervalMs}ms`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('tick simulator stopped');
  }

  private async emitBatch(): Promise<void> {
    for (const symbol of this.symbols) {
      const tick = this.normalize.execute(this.generateRaw(symbol));
      if (tick) {
        await this.processTick.execute(tick);
      }
    }
  }

  private generateRaw(symbol: string): unknown {
    const prev = this.prices.get(symbol) ?? 100;
    const change = prev * (Math.random() * 0.004 - 0.002); // ±0.2% random walk
    const last = Math.max(0.01, prev + change);
    const spread = last * 0.0002;
    const bid = Math.max(0.01, last - spread / 2);
    const ask = bid + spread;
    this.prices.set(symbol, last);
    return {
      symbol,
      bid: +bid.toFixed(4),
      ask: +ask.toFixed(4),
      last: +last.toFixed(4),
      volume: Math.floor(Math.random() * 10_000),
      timestamp: new Date().toISOString(),
    };
  }
}
