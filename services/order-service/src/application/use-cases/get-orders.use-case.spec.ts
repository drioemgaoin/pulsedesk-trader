import { GetOrdersUseCase } from './get-orders.use-case';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { IOrderRepository } from '../../domain/ports/order-repository.port';

const SAMPLE_ORDER = Order.create({
  id: 'order-1',
  commandId: 'cmd-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.MARKET,
  quantity: 10,
});

const makeRepo = (orders: Order[]): IOrderRepository => ({
  save: jest.fn(),
  findByCommandId: jest.fn(),
  findById: jest.fn(),
  findAllByAccount: jest.fn().mockResolvedValue(orders),
});

describe('Given an accountId with existing orders', () => {
  describe('when execute is called', () => {
    it('should return orders from repository', async () => {
      const repo = makeRepo([SAMPLE_ORDER]);
      const useCase = new GetOrdersUseCase(repo);
      const result = await useCase.execute('acc-001');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-1');
      expect(result[0].symbol).toBe('AAPL');
      expect(repo.findAllByAccount).toHaveBeenCalledWith('acc-001');
    });
  });
});

describe('Given an accountId with no orders', () => {
  describe('when execute is called', () => {
    it('should return empty array when no orders', async () => {
      const repo = makeRepo([]);
      const useCase = new GetOrdersUseCase(repo);
      const result = await useCase.execute('acc-002');
      expect(result).toHaveLength(0);
      expect(repo.findAllByAccount).toHaveBeenCalledWith('acc-002');
    });
  });
});
