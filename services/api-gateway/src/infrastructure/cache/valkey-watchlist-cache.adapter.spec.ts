import { ValkeyWatchlistCacheAdapter } from './valkey-watchlist-cache.adapter';
import type { WatchlistResponseV1 } from '@pulsedesk/contracts';

const WATCHLIST: WatchlistResponseV1 = {
  quotes: [
    { symbol: 'AAPL', bid: 162, ask: 162.1, last: 162.05, volume: 1000, timestamp: '2026-03-11T09:00:00.000Z' },
  ],
  asOf: '2026-03-11T09:00:00.000Z',
};

const makeLogger = () => ({ warn: jest.fn() });

describe('Given a ValkeyWatchlistCacheAdapter instance', () => {
  describe('when get is called and the key exists in Redis', () => {
    it('should return the parsed WatchlistResponseV1', async () => {
      const redis = { get: jest.fn().mockResolvedValue(JSON.stringify(WATCHLIST)), set: jest.fn() };
      const adapter = new ValkeyWatchlistCacheAdapter(redis as never, makeLogger() as never);

      const result = await adapter.get();

      expect(result).toEqual(WATCHLIST);
      expect(redis.get).toHaveBeenCalledWith('watchlist:snapshot');
    });
  });

  describe('when get is called and the key does not exist in Redis', () => {
    it('should return null', async () => {
      const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
      const adapter = new ValkeyWatchlistCacheAdapter(redis as never, makeLogger() as never);

      const result = await adapter.get();

      expect(result).toBeNull();
    });
  });

  describe('when get is called and Redis throws', () => {
    it('should return null and not re-throw (fail-open)', async () => {
      const redis = { get: jest.fn().mockRejectedValue(new Error('connection lost')), set: jest.fn() };
      const logger = makeLogger();
      const adapter = new ValkeyWatchlistCacheAdapter(redis as never, logger as never);

      const result = await adapter.get();

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('when set is called', () => {
    it('should store the serialized response with a 1 second TTL', async () => {
      const redis = { get: jest.fn(), set: jest.fn().mockResolvedValue('OK') };
      const adapter = new ValkeyWatchlistCacheAdapter(redis as never, makeLogger() as never);

      await adapter.set(WATCHLIST);

      expect(redis.set).toHaveBeenCalledWith(
        'watchlist:snapshot',
        JSON.stringify(WATCHLIST),
        'EX',
        1,
      );
    });
  });

  describe('when set is called and Redis throws', () => {
    it('should not re-throw (fail-open)', async () => {
      const redis = { get: jest.fn(), set: jest.fn().mockRejectedValue(new Error('write fail')) };
      const logger = makeLogger();
      const adapter = new ValkeyWatchlistCacheAdapter(redis as never, logger as never);

      await expect(adapter.set(WATCHLIST)).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
