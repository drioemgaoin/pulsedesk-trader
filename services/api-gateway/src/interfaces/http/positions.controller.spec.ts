import { ProxyService } from '../../application/proxy/proxy.service';
import { PositionsController } from './positions.controller';
import type { FastifyRequest } from 'fastify';

const mockProxy = {
  forward: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<ProxyService>;

describe('Given a PositionsController instance', () => {
  describe('when get is called', () => {
    it('should proxy GET to the portfolio service /positions endpoint', async () => {
      const controller = new PositionsController(mockProxy);
      const req = { headers: {} } as unknown as FastifyRequest;
      await controller.get(req);
      expect(mockProxy.forward).toHaveBeenCalledWith(
        req,
        expect.stringContaining('/positions'),
        'GET',
      );
    });
  });
});
