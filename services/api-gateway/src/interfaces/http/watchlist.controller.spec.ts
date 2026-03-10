import { ProxyService } from '../../application/proxy/proxy.service';
import { WatchlistController } from './watchlist.controller';
import type { FastifyRequest } from 'fastify';

const mockProxy = {
  forward: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<ProxyService>;

describe('Given a WatchlistController instance', () => {
  describe('when get is called', () => {
    it('should proxy GET to the market-data service /watchlist endpoint', async () => {
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
});
