import { ProcessFillNotificationUseCase } from './process-fill-notification.use-case';
import { IOrderRepository } from '../../domain/ports/order-repository.port';
import { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { OrderFilledEvent } from '@pulsedesk/contracts';

const FILL_EVENT: OrderFilledEvent = {
  eventType: 'execution.filled',
  schemaVersion: 1,
  executionId: 'exec-001',
  orderId: 'order-001',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  filledQuantity: 10,
  fillPrice: 150,
  timestamp: new Date().toISOString(),
};

function buildOrder(status: OrderStatus): Order {
  const base = Order.create({
    id: 'order-001',
    commandId: 'cmd-001',
    accountId: 'acc-001',
    symbol: 'AAPL',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    quantity: 10,
    limitPrice: 150,
  });

  switch (status) {
    case OrderStatus.ACCEPTED:
      return base.accept();
    case OrderStatus.FILLED:
      return base.accept().fill();
    case OrderStatus.REJECTED:
      return base.reject('risk limit exceeded');
    case OrderStatus.CANCELLED:
      return base.accept().cancel();
    default:
      return base; // PENDING
  }
}

function makeRepo(order: Order | null): jest.Mocked<IOrderRepository> {
  return {
    findById: jest.fn().mockResolvedValue(order),
    findByCommandId: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((o: Order) => Promise.resolve(o)),
    findAllByAccount: jest.fn().mockResolvedValue([]),
  };
}

describe('Given an ACCEPTED order', () => {
  describe('when a fill event is processed', () => {
    it('should transition to FILLED and save', async () => {
      const repo = makeRepo(buildOrder(OrderStatus.ACCEPTED));
      const useCase = new ProcessFillNotificationUseCase(repo);

      await useCase.execute(FILL_EVENT);

      expect(repo.save).toHaveBeenCalledTimes(1);
      const savedOrder = (repo.save as jest.Mock).mock.calls[0][0] as Order;
      expect(savedOrder.status).toBe(OrderStatus.FILLED);
    });

    it('should return the filled order', async () => {
      const repo = makeRepo(buildOrder(OrderStatus.ACCEPTED));
      const useCase = new ProcessFillNotificationUseCase(repo);

      const result = await useCase.execute(FILL_EVENT);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(OrderStatus.FILLED);
    });
  });
});

describe('Given a FILLED order', () => {
  describe('when a fill event is processed', () => {
    it('should skip (idempotency) and return existing', async () => {
      const filledOrder = buildOrder(OrderStatus.FILLED);
      const repo = makeRepo(filledOrder);
      const useCase = new ProcessFillNotificationUseCase(repo);

      const result = await useCase.execute(FILL_EVENT);

      expect(repo.save).not.toHaveBeenCalled();
      expect(result).toBe(filledOrder);
    });
  });
});

describe('Given a REJECTED order', () => {
  describe('when a fill event is processed', () => {
    it('should skip (out-of-order) and return null', async () => {
      const repo = makeRepo(buildOrder(OrderStatus.REJECTED));
      const useCase = new ProcessFillNotificationUseCase(repo);

      const result = await useCase.execute(FILL_EVENT);

      expect(repo.save).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});

describe('Given a CANCELLED order', () => {
  describe('when a fill event is processed', () => {
    it('should skip (out-of-order) and return null', async () => {
      const repo = makeRepo(buildOrder(OrderStatus.CANCELLED));
      const useCase = new ProcessFillNotificationUseCase(repo);

      const result = await useCase.execute(FILL_EVENT);

      expect(repo.save).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});

describe('Given no order found', () => {
  describe('when a fill event is processed', () => {
    it('should skip and return null', async () => {
      const repo = makeRepo(null);
      const useCase = new ProcessFillNotificationUseCase(repo);

      const result = await useCase.execute(FILL_EVENT);

      expect(repo.save).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
