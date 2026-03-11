import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CircuitBreaker = require('opossum') as typeof import('opossum');

interface BreakerConfig {
  timeout: number;
  capacity: number;
}

const DEFAULT_CONFIG: BreakerConfig = { timeout: 5_000, capacity: 50 };

const UPSTREAM_CONFIG: Record<string, BreakerConfig> = {
  order: { timeout: 5_000, capacity: 100 },
  portfolio: { timeout: 3_000, capacity: 50 },
};

/**
 * Manages per-upstream opossum circuit breakers.
 * Breakers are keyed by URL origin and created lazily on first use.
 * Upstream-specific timeout and bulkhead capacity are resolved by matching
 * the known ORDER_SERVICE_URL / PORTFOLIO_SERVICE_URL env vars.
 */
@Injectable()
export class CircuitBreakerRegistry {
  private readonly logger = new Logger(CircuitBreakerRegistry.name);
  private readonly breakers = new Map<
    string,
    InstanceType<typeof CircuitBreaker>
  >();

  private readonly orderOrigin: string;
  private readonly portfolioOrigin: string;

  constructor() {
    this.orderOrigin = this.toOrigin(
      process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:3012',
    );
    this.portfolioOrigin = this.toOrigin(
      process.env['PORTFOLIO_SERVICE_URL'] ?? 'http://localhost:3015',
    );
  }

  /**
   * Fires `fn` through the circuit breaker for the given upstream URL.
   * Throws ServiceUnavailableException when the circuit is open or capacity is full.
   */
  async fire<T>(url: string, fn: () => Promise<T>): Promise<T> {
    const origin = this.toOrigin(url);
    const breaker = this.getOrCreate(origin);
    try {
      // opossum wraps a generic "call a function" action
      return (await breaker.fire(fn)) as T;
    } catch (err: unknown) {
      if (this.isOpenCircuitError(err) || this.isCapacityError(err)) {
        throw new ServiceUnavailableException('Upstream circuit open or at capacity');
      }
      throw err;
    }
  }

  /** Returns breaker state for each registered upstream (for observability). */
  getStates(): Record<string, string> {
    const states: Record<string, string> = {};
    for (const [origin, breaker] of this.breakers) {
      states[origin] = breaker.opened
        ? 'open'
        : breaker.halfOpen
          ? 'half-open'
          : 'closed';
    }
    return states;
  }

  private getOrCreate(origin: string): InstanceType<typeof CircuitBreaker> {
    if (!this.breakers.has(origin)) {
      const config = this.configFor(origin);
      // The action wrapped by the breaker: calls whatever async fn is passed to fire()
      const action = (fn: () => Promise<unknown>) => fn();
      const breaker = new CircuitBreaker(action, {
        timeout: config.timeout,
        errorThresholdPercentage: 50,
        resetTimeout: 15_000,
        volumeThreshold: 5,
        capacity: config.capacity,
      });
      breaker.on('open', () =>
        this.logger.warn({ origin }, 'circuit breaker OPEN'),
      );
      breaker.on('halfOpen', () =>
        this.logger.log({ origin }, 'circuit breaker HALF-OPEN'),
      );
      breaker.on('close', () =>
        this.logger.log({ origin }, 'circuit breaker CLOSED'),
      );
      this.breakers.set(origin, breaker);
    }
    return this.breakers.get(origin)!;
  }

  private configFor(origin: string): BreakerConfig {
    if (origin === this.orderOrigin) return UPSTREAM_CONFIG['order']!;
    if (origin === this.portfolioOrigin) return UPSTREAM_CONFIG['portfolio']!;
    return DEFAULT_CONFIG;
  }

  private toOrigin(url: string): string {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  }

  private isOpenCircuitError(err: unknown): boolean {
    return (
      err instanceof Error &&
      (err.constructor.name === 'OpenCircuitError' ||
        err.message.includes('open circuit') ||
        err.message.includes('Breaker is open'))
    );
  }

  private isCapacityError(err: unknown): boolean {
    return (
      err instanceof Error &&
      (err.constructor.name === 'BulkheadRejectedError' ||
        err.message.includes('Bulkhead'))
    );
  }
}
