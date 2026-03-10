import { SubmitOrderUseCase } from './submit-order.use-case';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { IOrderRepository } from '../../domain/ports/order-repository.port';

const makeRepo = (existing: Order | null = null): IOrderRepository => ({
  save: jest.fn().mockImplementation((o: Order) => Promise.resolve(o)),
  findByCommandId: jest.fn().mockResolvedValue(existing),
  findById: jest.fn().mockResolvedValue(null),
});

const VALID_CMD = {
  commandId: 'cmd-uuid-1',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 5,
  limitPrice: 150,
};

describe('Given no existing order for the commandId', () => {
  describe('when SubmitOrderUseCase.execute is called with a valid command', () => {
    it('should create and persist a new PENDING order', async () => {
      const repo = makeRepo();
      const { order, created } = await new SubmitOrderUseCase(repo).execute(VALID_CMD);
      expect(created).toBe(true);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.commandId).toBe(VALID_CMD.commandId);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('should normalise the symbol to uppercase before persisting', async () => {
      const repo = makeRepo();
      const { order } = await new SubmitOrderUseCase(repo).execute({ ...VALID_CMD, symbol: 'aapl' });
      expect(order.symbol).toBe('AAPL');
    });
  });

  describe('when SubmitOrderUseCase.execute is called with an invalid quantity', () => {
    it('should propagate OrderValidationError without persisting', async () => {
      const repo = makeRepo();
      await expect(new SubmitOrderUseCase(repo).execute({ ...VALID_CMD, quantity: -1 }))
        .rejects.toThrow('quantity must be greater than 0');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});

describe('Given an existing order with the same commandId', () => {
  describe('when SubmitOrderUseCase.execute is called with the same commandId', () => {
    it('should return the existing order without saving a duplicate', async () => {
      const existing = Order.create({ id: 'existing-id', ...VALID_CMD });
      const repo = makeRepo(existing);
      const { order, created } = await new SubmitOrderUseCase(repo).execute(VALID_CMD);
      expect(created).toBe(false);
      expect(order.id).toBe('existing-id');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
