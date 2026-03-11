import { ProxyService } from '../../application/proxy/proxy.service';
import { IWatchlistCache } from '../../application/cache/watchlist-cache.port';
import { WatchlistController } from './watchlist.controller';
import type { FastifyRequest } from 'fastify';
import type { WatchlistResponseV1 } from '@pulsedesk/contracts';

const WATCHLIST: WatchlistResponseV1 = {
  quotes: [
    { symbol: 'AAPL', bid: 162, ask: 162.1, last: 162.05, volume: 1000, timestamp: '2026-03-11T09:00:00.000Z' },
    { symbol: 'TSLA', bid: 280, ask: 280.5, last: 280.2, volume: 500, timestamp: '2026-03-11T09:00:00.000Z' },
    { symbol: 'MSFT', bid: 415, ask: 415.2, last: 415.1, volume: 800, timestamp: '2026-03-11T09:00:00.000Z' },
  ],
  asOf: '2026-03-11T09:00:00.000Z',
};

const makeReq = (): FastifyRequest => ({ headers: {} } as unknown as FastifyRequest);

const makeCache = (cached: WatchlistResponseV1 | null): jest.Mocked<IWatchlistCache> => ({
  get: jest.fn().mockResolvedValue(cached),
  set: jest.fn().mockResolvedValue(undefined),
});

const makeProxy = (response: WatchlistResponseV1): jest.Mocked<ProxyService> =>
  ({ forward: jest.fn().mockResolvedValue(response) }) as unknown as jest.Mocked<ProxyService>;

describe('Given a WatchlistController instance', () => {
  describe('when get is called and the cache contains a response', () => {
    it('should return the cached response without calling the proxy', async () => {
      const cache = makeCache(WATCHLIST);
      const proxy = makeProxy(WATCHLIST);
      const controller = new WatchlistController(proxy, cache);

      const result = await controller.get(makeReq());

      expect(result.quotes).toHaveLength(3);
      expect(proxy.forward).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe('when get is called and the cache is empty', () => {
    it('should proxy GET to the market-data service and cache the response', async () => {
      const cache = makeCache(null);
      const proxy = makeProxy(WATCHLIST);
      const controller = new WatchlistController(proxy, cache);

      const result = await controller.get(makeReq());

      expect(proxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/watchlist'),
        'GET',
      );
      expect(cache.set).toHaveBeenCalledWith(WATCHLIST);
      expect(result.quotes).toHaveLength(3);
    });
  });

  describe('when get is called with a symbols filter and the cache contains a response', () => {
    it('should return only quotes matching the requested symbols', async () => {
      const cache = makeCache(WATCHLIST);
      const controller = new WatchlistController(makeProxy(WATCHLIST), cache);

      const result = await controller.get(makeReq(), 'AAPL,MSFT');

      expect(result.quotes).toHaveLength(2);
      expect(result.quotes.map((q) => q.symbol)).toEqual(['AAPL', 'MSFT']);
    });
  });

  describe('when get is called with a symbols filter and the cache is empty', () => {
    it('should fetch from proxy, cache the full response, and filter the result', async () => {
      const cache = makeCache(null);
      const proxy = makeProxy(WATCHLIST);
      const controller = new WatchlistController(proxy, cache);

      const result = await controller.get(makeReq(), 'TSLA');

      expect(proxy.forward).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalledWith(WATCHLIST);
      expect(result.quotes).toHaveLength(1);
      expect(result.quotes[0].symbol).toBe('TSLA');
    });
  });
});
