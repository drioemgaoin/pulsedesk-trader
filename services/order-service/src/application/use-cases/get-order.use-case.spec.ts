import { GetOrderUseCase } from './get-order.use-case';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import { IOrderRepository } from '../../domain/ports/order-repository.port';

const EXISTING_ORDER = Order.create({
  id: 'order-1',
  commandId: 'cmd-1',
  accountId: 'acc-001',
  symbol: 'MSFT',
  side: OrderSide.SELL,
  type: OrderType.MARKET,
  quantity: 3,
});

const makeRepo = (order: Order | null): IOrderRepository => ({
  save: jest.fn(),
  findByCommandId: jest.fn(),
  findById: jest.fn().mockResolvedValue(order),
  findAllByAccount: jest.fn().mockResolvedValue([]),
});

describe('Given an order exists in the repository', () => {
  describe('when GetOrderUseCase.execute is called with its ID', () => {
    it('should return the order with the correct symbol and ID', async () => {
      const result = await new GetOrderUseCase(makeRepo(EXISTING_ORDER)).execute('order-1');
      expect(result.id).toBe('order-1');
      expect(result.symbol).toBe('MSFT');
    });
  });
});

describe('Given no order exists for the requested ID', () => {
  describe('when GetOrderUseCase.execute is called', () => {
    it('should throw OrderNotFoundError', async () => {
      await expect(new GetOrderUseCase(makeRepo(null)).execute('missing-id'))
        .rejects.toThrow(OrderNotFoundError);
    });
  });
});
