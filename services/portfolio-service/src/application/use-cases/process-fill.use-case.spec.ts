import { ProcessFillUseCase } from './process-fill.use-case';
import { Position } from '../../domain/position.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { IPositionRepository } from '../../domain/ports/position-repository.port';
import { OrderFilledEvent } from '@pulsedesk/contracts';

const makeFillEvent = (overrides: Partial<OrderFilledEvent> = {}): OrderFilledEvent => ({
  eventType: 'execution.filled',
  schemaVersion: 1,
  executionId: 'exec-1',
  orderId: 'order-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  filledQuantity: 10,
  fillPrice: 150,
  timestamp: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

const makeRepo = (
  existing: Position | null = null,
  saveResult: 'SAVED' | 'DUPLICATE' = 'SAVED',
): jest.Mocked<IPositionRepository> => ({
  findByAccountAndSymbol: jest.fn().mockResolvedValue(existing),
  findAllByAccount: jest.fn().mockResolvedValue([]),
  savePositionWithFill: jest.fn().mockResolvedValue(saveResult),
});

describe('Given no existing position', () => {
  describe('when execute is called with a BUY fill event', () => {
    it('should create a new position and return SAVED', async () => {
      const repo = makeRepo(null, 'SAVED');
      const useCase = new ProcessFillUseCase(repo);
      await useCase.execute(makeFillEvent());
      expect(repo.savePositionWithFill).toHaveBeenCalledTimes(1);
      const [savedPosition] = repo.savePositionWithFill.mock.calls[0] as [Position, string];
      expect(savedPosition.quantity).toBe(10);
      expect(savedPosition.averageCost).toBe(150);
    });
  });
});

describe('Given an existing position', () => {
  describe('when execute is called with another BUY fill', () => {
    it('should update position with weighted average cost', async () => {
      const existing = new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 10, averageCost: 100, updatedAt: '' });
      const repo = makeRepo(existing, 'SAVED');
      const useCase = new ProcessFillUseCase(repo);
      await useCase.execute(makeFillEvent({ filledQuantity: 10, fillPrice: 120 }));
      expect(repo.savePositionWithFill).toHaveBeenCalledTimes(1);
      const [savedPosition] = repo.savePositionWithFill.mock.calls[0] as [Position, string];
      expect(savedPosition.quantity).toBe(20);
      expect(savedPosition.averageCost).toBe(110);
    });
  });
});

describe('Given a duplicate executionId (repo returns DUPLICATE)', () => {
  describe('when execute is called', () => {
    it('should skip without updating position (repo.savePositionWithFill called once, returns DUPLICATE)', async () => {
      const repo = makeRepo(null, 'DUPLICATE');
      const useCase = new ProcessFillUseCase(repo);
      await useCase.execute(makeFillEvent());
      expect(repo.savePositionWithFill).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Given an existing position (qty=10)', () => {
  describe('when execute is called with a SELL fill (qty=5)', () => {
    it('should reduce position quantity', async () => {
      const existing = new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 10, averageCost: 100, updatedAt: '' });
      const repo = makeRepo(existing, 'SAVED');
      const useCase = new ProcessFillUseCase(repo);
      await useCase.execute(makeFillEvent({ side: OrderSide.SELL, filledQuantity: 5, fillPrice: 160 }));
      expect(repo.savePositionWithFill).toHaveBeenCalledTimes(1);
      const [savedPosition] = repo.savePositionWithFill.mock.calls[0] as [Position, string];
      expect(savedPosition.quantity).toBe(5);
    });
  });
});

describe('Given repo.savePositionWithFill returns DUPLICATE on second call', () => {
  describe('when execute is called twice with same event', () => {
    it('should only process once', async () => {
      const repo = makeRepo(null, 'SAVED');
      repo.savePositionWithFill
        .mockResolvedValueOnce('SAVED')
        .mockResolvedValueOnce('DUPLICATE');
      const useCase = new ProcessFillUseCase(repo);
      const event = makeFillEvent();
      await useCase.execute(event);
      await useCase.execute(event);
      expect(repo.savePositionWithFill).toHaveBeenCalledTimes(2);
    });
  });
});
