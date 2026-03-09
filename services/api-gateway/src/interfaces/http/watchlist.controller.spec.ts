import { ProxyService } from '../../application/proxy/proxy.service';
import { WatchlistController } from './watchlist.controller';
import type { FastifyRequest } from 'fastify';

const mockProxy = {
  forward: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<ProxyService>;

describe('WatchlistController', () => {
  it('get proxies GET to market-data service /watchlist', async () => {
    const controller = new WatchlistController(mockProxy);
    const req = { headers: {} } as unknown as FastifyRequest;
    await controller.get(req);
    expect(mockProxy.forward).toHaveBeenCalledWith(
      req,
      expect.stringContaining('/watchlist'),
      'GET',
    );
  });
});
