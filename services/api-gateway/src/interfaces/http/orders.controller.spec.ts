import { ProxyService } from '../../application/proxy/proxy.service';
import { OrdersController } from './orders.controller';
import type { FastifyRequest } from 'fastify';

const makeReq = (): FastifyRequest => ({ headers: {} } as unknown as FastifyRequest);
const makeAuthReq = (sub: string): FastifyRequest =>
  ({ headers: {}, user: { sub } } as unknown as FastifyRequest);

const mockProxy = {
  forward: jest.fn(),
} as unknown as jest.Mocked<ProxyService>;

describe('Given an OrdersController instance', () => {
  let controller: OrdersController;

  beforeEach(() => {
    controller = new OrdersController(mockProxy);
    jest.clearAllMocks();
  });

  describe('when submit is called with an order body', () => {
    it('should proxy POST to the order service /orders endpoint', async () => {
      (mockProxy.forward as jest.Mock).mockResolvedValue({ ok: true });
      await controller.submit(makeReq(), { symbol: 'AAPL' });
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/orders'),
        'POST',
        { symbol: 'AAPL' },
      );
    });
  });

  describe('when get is called with an order id matching the JWT subject', () => {
    it('should proxy GET and return the order', async () => {
      (mockProxy.forward as jest.Mock).mockResolvedValue({ id: 'order-1', accountId: 'acc-001' });
      const result = await controller.get(makeAuthReq('acc-001'), 'order-1');
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/orders/order-1'),
        'GET',
      );
      expect((result as { id: string }).id).toBe('order-1');
    });
  });

  describe('when get is called without a JWT user', () => {
    it('should throw a 401 error', async () => {
      let thrown: unknown;
      try {
        await controller.get(makeReq(), 'order-1');
      } catch (e) {
        thrown = e;
      }
      expect((thrown as { getStatus(): number }).getStatus()).toBe(401);
    });
  });

  describe('when get is called for an order belonging to a different account', () => {
    it('should throw a 403 error', async () => {
      (mockProxy.forward as jest.Mock).mockResolvedValue({ id: 'order-1', accountId: 'acc-other' });
      let thrown: unknown;
      try {
        await controller.get(makeAuthReq('acc-001'), 'order-1');
      } catch (e) {
        thrown = e;
      }
      expect((thrown as { getStatus(): number }).getStatus()).toBe(403);
    });
  });

  describe('when cancel is called for an order matching the JWT subject', () => {
    it('should verify ownership then proxy POST to /orders/:id/cancel', async () => {
      (mockProxy.forward as jest.Mock)
        .mockResolvedValueOnce({ id: 'order-1', accountId: 'acc-001' })
        .mockResolvedValueOnce({ ok: true });
      await controller.cancel(makeAuthReq('acc-001'), 'order-1');
      const calls = (mockProxy.forward as jest.Mock).mock.calls;
      expect(calls[0][1]).toContain('/orders/order-1');
      expect(calls[0][2]).toBe('GET');
      expect(calls[1][1]).toContain('/orders/order-1/cancel');
      expect(calls[1][2]).toBe('POST');
    });
  });

  describe('when cancel is called without a JWT user', () => {
    it('should throw a 401 error', async () => {
      let thrown: unknown;
      try {
        await controller.cancel(makeReq(), 'order-1');
      } catch (e) {
        thrown = e;
      }
      expect((thrown as { getStatus(): number }).getStatus()).toBe(401);
    });
  });

  describe('when cancel is called for an order belonging to a different account', () => {
    it('should throw a 403 error without issuing the cancel', async () => {
      (mockProxy.forward as jest.Mock).mockResolvedValue({ id: 'order-1', accountId: 'acc-other' });
      let thrown: unknown;
      try {
        await controller.cancel(makeAuthReq('acc-001'), 'order-1');
      } catch (e) {
        thrown = e;
      }
      expect((thrown as { getStatus(): number }).getStatus()).toBe(403);
      expect(mockProxy.forward).toHaveBeenCalledTimes(1);
    });
  });

  describe('when list is called with an accountId matching the JWT subject', () => {
    it('should proxy GET to the order service /orders?accountId endpoint', async () => {
      (mockProxy.forward as jest.Mock).mockResolvedValue({ ok: true });
      const req = makeAuthReq('acc-001');
      await controller.list(req, 'acc-001');
      expect(mockProxy.forward).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('/orders?accountId=acc-001'),
        'GET',
      );
    });
  });

  describe('when list is called with status, limit, and offset parameters', () => {
    it('should forward status, limit, and offset in the proxied URL', async () => {
      (mockProxy.forward as jest.Mock).mockResolvedValue({ ok: true });
      await controller.list(makeAuthReq('acc-001'), 'acc-001', 'FILLED', '10', '20');
      const [, url] = (mockProxy.forward as jest.Mock).mock.calls[0] as [unknown, string];
      expect(url).toContain('status=FILLED');
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
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
