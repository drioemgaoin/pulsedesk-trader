import { ProxyService } from '../../application/proxy/proxy.service';
import { OrdersController } from './orders.controller';
import type { FastifyRequest } from 'fastify';

const makeReq = (): FastifyRequest => ({ headers: {} } as unknown as FastifyRequest);
const mockProxy = {
  forward: jest.fn().mockResolvedValue({ ok: true }),
} as unknown as jest.Mocked<ProxyService>;

describe('Given an OrdersController instance', () => {
  let controller: OrdersController;

  beforeEach(() => {
    controller = new OrdersController(mockProxy);
    jest.clearAllMocks();
  });

  describe('when submit is called with an order body', () => {
    it('should proxy POST to the order service /orders endpoint', async () => {
      await controller.submit(makeReq(), { symbol: 'AAPL' });
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/orders'),
        'POST',
        { symbol: 'AAPL' },
      );
    });
  });

  describe('when get is called with an order id', () => {
    it('should proxy GET to the order service /orders/:id endpoint', async () => {
      await controller.get(makeReq(), 'order-1');
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/orders/order-1'),
        'GET',
      );
    });
  });

  describe('when cancel is called with an order id', () => {
    it('should proxy POST to the order service /orders/:id/cancel endpoint', async () => {
      await controller.cancel(makeReq(), 'order-1');
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/orders/order-1/cancel'),
        'POST',
      );
    });
  });

  describe('when list is called with an accountId matching the JWT subject', () => {
    it('should proxy GET to the order service /orders?accountId endpoint', async () => {
      const req = { ...makeReq(), user: { sub: 'acc-001' } } as unknown as FastifyRequest;
      await controller.list(req, 'acc-001');
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/orders?accountId=acc-001'),
        'GET',
      );
    });
  });

  describe('when list is called with an accountId that does not match the JWT subject', () => {
    it('should throw a 403 error', async () => {
      const req = { ...makeReq(), user: { sub: 'acc-other' } } as unknown as FastifyRequest;
      let thrown: unknown;
      try {
        await controller.list(req, 'acc-001');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeDefined();
      expect((thrown as { getStatus(): number }).getStatus()).toBe(403);
    });
  });
});
