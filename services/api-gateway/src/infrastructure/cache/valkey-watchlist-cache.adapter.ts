import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Redis } from 'ioredis';
import type { WatchlistResponseV1 } from '@pulsedesk/contracts';
import { IWatchlistCache } from '../../application/cache/watchlist-cache.port';

export const VALKEY_CLIENT = Symbol('VALKEY_CLIENT');

const CACHE_KEY = 'watchlist:snapshot';
const TTL_SECONDS = 1;

@Injectable()
export class ValkeyWatchlistCacheAdapter implements IWatchlistCache {
  constructor(
    @Inject(VALKEY_CLIENT) private readonly redis: Redis,
    @InjectPinoLogger(ValkeyWatchlistCacheAdapter.name)
    private readonly logger: PinoLogger,
  ) {}

  async get(): Promise<WatchlistResponseV1 | null> {
    try {
      const raw = await this.redis.get(CACHE_KEY);
      return raw ? (JSON.parse(raw) as WatchlistResponseV1) : null;
    } catch (err) {
      this.logger.warn({ err }, 'watchlist cache read failed — serving live');
      return null;
    }
  }

  async set(data: WatchlistResponseV1): Promise<void> {
    try {
      await this.redis.set(CACHE_KEY, JSON.stringify(data), 'EX', TTL_SECONDS);
    } catch (err) {
      this.logger.warn({ err }, 'watchlist cache write failed — continuing');
    }
  }
}
