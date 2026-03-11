import { GetOrdersUseCase } from './get-orders.use-case';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { IOrderRepository } from '../../domain/ports/order-repository.port';

const makeOrder = (id: string, symbol = 'AAPL') =>
  Order.create({
    id,
    commandId: `cmd-${id}`,
    accountId: 'acc-001',
    symbol,
    side: OrderSide.BUY,
    type: OrderType.MARKET,
    quantity: 10,
  });

const makeRepo = (orders: Order[], total?: number): IOrderRepository => ({
  save: jest.fn(),
  findByCommandId: jest.fn(),
  findById: jest.fn(),
  findAllByAccount: jest
    .fn()
    .mockResolvedValue({ orders, total: total ?? orders.length }),
});

describe('Given a GetOrdersUseCase instance', () => {
  describe('when execute is called with only accountId', () => {
    it('should return orders from repository with default pagination', async () => {
      const order = makeOrder('order-1');
      const repo = makeRepo([order]);
      const useCase = new GetOrdersUseCase(repo);

      const result = await useCase.execute({ accountId: 'acc-001' });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].id).toBe('order-1');
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(repo.findAllByAccount).toHaveBeenCalledWith('acc-001', {
        status: undefined,
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('when execute is called with explicit limit and offset', () => {
    it('should pass limit and offset to the repository', async () => {
      const repo = makeRepo([makeOrder('order-2')], 100);
      const useCase = new GetOrdersUseCase(repo);

      const result = await useCase.execute({ accountId: 'acc-001', limit: 10, offset: 20 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      expect(result.total).toBe(100);
      expect(repo.findAllByAccount).toHaveBeenCalledWith('acc-001', {
        status: undefined,
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('when execute is called with a status filter', () => {
    it('should pass status to the repository', async () => {
      const repo = makeRepo([makeOrder('order-3')]);
      const useCase = new GetOrdersUseCase(repo);

      await useCase.execute({ accountId: 'acc-001', status: 'FILLED' });

      expect(repo.findAllByAccount).toHaveBeenCalledWith('acc-001', {
        status: 'FILLED',
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('when execute is called and the repository returns empty', () => {
    it('should return empty orders array with total 0', async () => {
      const repo = makeRepo([], 0);
      const useCase = new GetOrdersUseCase(repo);

      const result = await useCase.execute({ accountId: 'acc-002' });

      expect(result.orders).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
