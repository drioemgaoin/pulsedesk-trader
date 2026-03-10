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
});
