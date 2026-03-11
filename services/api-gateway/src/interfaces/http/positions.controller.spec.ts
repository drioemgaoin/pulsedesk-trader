import { UnauthorizedException } from '@nestjs/common';
import { ProxyService } from '../../application/proxy/proxy.service';
import { PositionsController } from './positions.controller';
import type { FastifyRequest } from 'fastify';

const mockProxy = {
  forward: jest.fn().mockResolvedValue({ positions: [] }),
} as unknown as jest.Mocked<ProxyService>;

const makeReq = (sub?: string): FastifyRequest =>
  ({
    headers: {},
    ...(sub !== undefined ? { user: { sub } } : {}),
  }) as unknown as FastifyRequest;

describe('Given a PositionsController instance', () => {
  let controller: PositionsController;

  beforeEach(() => {
    controller = new PositionsController(mockProxy);
    jest.clearAllMocks();
  });

  describe('when get is called with an authenticated request', () => {
    it('should proxy GET to the portfolio service /v1/positions/:accountId endpoint', async () => {
      await controller.get(makeReq('acc-001'));
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/v1/positions/acc-001'),
        'GET',
      );
    });
  });

  describe('when get is called with a request that has no JWT user', () => {
    it('should throw UnauthorizedException', async () => {
      let thrown: unknown;
      try {
        await controller.get(makeReq());
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(UnauthorizedException);
    });
  });
});
