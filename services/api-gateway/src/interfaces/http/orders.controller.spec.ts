import { ProxyService } from '../../application/proxy/proxy.service';
import { OrdersController } from './orders.controller';
import type { FastifyRequest } from 'fastify';

const makeReq = (): FastifyRequest => ({ headers: {} } as unknown as FastifyRequest);
const mockProxy = {
  forward: jest.fn().mockResolvedValue({ ok: true }),
} as unknown as jest.Mocked<ProxyService>;

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(() => {
    controller = new OrdersController(mockProxy);
    jest.clearAllMocks();
  });

  it('submit proxies POST to order service', async () => {
    await controller.submit(makeReq(), { symbol: 'AAPL' });
    expect(mockProxy.forward).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('/orders'),
      'POST',
      { symbol: 'AAPL' },
    );
  });

  it('get proxies GET /orders/:id', async () => {
    await controller.get(makeReq(), 'order-1');
    expect(mockProxy.forward).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('/orders/order-1'),
      'GET',
    );
  });

  it('cancel proxies POST /orders/:id/cancel', async () => {
    await controller.cancel(makeReq(), 'order-1');
    expect(mockProxy.forward).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('/orders/order-1/cancel'),
      'POST',
    );
  });
});
