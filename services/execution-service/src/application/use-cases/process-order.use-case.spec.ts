import { ProcessOrderUseCase } from './process-order.use-case';
import { Execution } from '../../domain/execution.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { NoMarketPriceError } from '../../domain/errors/no-market-price.error';
import { IExecutionRepository } from '../../domain/ports/execution-repository.port';
import { IFillEventPublisher } from '../../domain/ports/fill-event-publisher.port';
import { IMarketPriceCache } from '../../domain/ports/market-price-cache.port';
import { OrderSubmittedEvent } from '@pulsedesk/contracts';

const makeRepo = (existing: Execution | null = null): IExecutionRepository => ({
  save: jest.fn().mockImplementation((e: Execution) => Promise.resolve(e)),
  findByIdempotencyKey: jest.fn().mockResolvedValue(existing),
});

const makePublisher = (): jest.Mocked<IFillEventPublisher> => ({
  publishFill: jest.fn().mockResolvedValue(undefined),
});

const makeCache = (price: number | null = 155): IMarketPriceCache => ({
  getPrice: jest.fn().mockReturnValue(price),
  setPrice: jest.fn(),
});

const LIMIT_EVENT: OrderSubmittedEvent = {
  eventType: 'order.submitted',
  schemaVersion: 1,
  orderId: 'order-1',
  idempotencyKey: 'cmd-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 10,
  limitPrice: 150,
  timestamp: '2026-03-10T00:00:00.000Z',
};

const MARKET_EVENT: OrderSubmittedEvent = {
  eventType: 'order.submitted',
  schemaVersion: 1,
  orderId: 'order-2',
  idempotencyKey: 'cmd-2',
  accountId: 'acc-001',
  symbol: 'MSFT',
  side: OrderSide.SELL,
  type: OrderType.MARKET,
  quantity: 5,
  timestamp: '2026-03-10T00:00:00.000Z',
};

describe('Given a new LIMIT order event', () => {
  describe('when ProcessOrderUseCase.execute is called', () => {
    it('should create a fill at the limit price and return created=true', async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const cache = makeCache();
      const { execution, created } = await new ProcessOrderUseCase(repo, publisher, cache).execute(LIMIT_EVENT);
      expect(created).toBe(true);
      expect(execution.fillPrice).toBe(150);
      expect(execution.filledQuantity).toBe(10);
      expect(execution.orderId).toBe('order-1');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('should publish the fill event', async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const cache = makeCache();
      await new ProcessOrderUseCase(repo, publisher, cache).execute(LIMIT_EVENT);
      expect(publisher.publishFill).toHaveBeenCalledTimes(1);
      expect(publisher.publishFill).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1', fillPrice: 150 }),
      );
    });
  });
});

describe('Given a new MARKET order event with a cached price', () => {
  describe('when ProcessOrderUseCase.execute is called', () => {
    it('should fill at the cached market price', async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const cache = makeCache(155.5);
      const { execution } = await new ProcessOrderUseCase(repo, publisher, cache).execute(MARKET_EVENT);
      expect(execution.fillPrice).toBe(155.5);
    });
  });
});

describe('Given a MARKET order event with no cached price', () => {
  describe('when ProcessOrderUseCase.execute is called', () => {
    it('should throw NoMarketPriceError without saving', async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const cache = makeCache(null);
      await expect(new ProcessOrderUseCase(repo, publisher, cache).execute(MARKET_EVENT))
        .rejects.toThrow(NoMarketPriceError);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});

describe('Given a duplicate order event (same orderId already executed)', () => {
  describe('when ProcessOrderUseCase.execute is called', () => {
    it('should return the existing execution with created=false without saving again', async () => {
      const existing = new Execution({
        id: 'exec-existing',
        idempotencyKey: 'order-1',
        orderId: 'order-1',
        accountId: 'acc-001',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        filledQuantity: 10,
        fillPrice: 150,
        filledAt: '2026-03-10T00:00:00.000Z',
      });
      const repo = makeRepo(existing);
      const publisher = makePublisher();
      const cache = makeCache();
      const { execution, created } = await new ProcessOrderUseCase(repo, publisher, cache).execute(LIMIT_EVENT);
      expect(created).toBe(false);
      expect(execution.id).toBe('exec-existing');
      expect(repo.save).not.toHaveBeenCalled();
      expect(publisher.publishFill).not.toHaveBeenCalled();
    });
  });
});

describe('Given a fill event publisher that throws', () => {
  describe('when ProcessOrderUseCase.execute is called', () => {
    it('should resolve successfully — execution persisted even if publish fails', async () => {
      const repo = makeRepo();
      const publisher: jest.Mocked<IFillEventPublisher> = {
        publishFill: jest.fn().mockRejectedValue(new Error('broker unavailable')),
      };
      const cache = makeCache();
      await expect(new ProcessOrderUseCase(repo, publisher, cache).execute(LIMIT_EVENT))
        .resolves.toMatchObject({ created: true });
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });
});
