import { ProxyService } from '../../application/proxy/proxy.service';
import { PositionsController } from './positions.controller';
import type { FastifyRequest } from 'fastify';

const mockProxy = {
  forward: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<ProxyService>;

describe('PositionsController', () => {
  it('get proxies GET to portfolio service /positions', async () => {
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
