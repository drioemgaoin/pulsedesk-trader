import { MatchLimitOrdersUseCase } from './match-limit-orders.use-case';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { IExecutionRepository } from '../../domain/ports/execution-repository.port';
import { IFillEventPublisher } from '../../domain/ports/fill-event-publisher.port';
import { ILimitOrderQueue, PendingLimitOrder } from '../../domain/ports/limit-order-queue.port';
import { Execution } from '../../domain/execution.entity';

const makeRepo = (): jest.Mocked<IExecutionRepository> => ({
  save: jest.fn().mockImplementation((e: Execution) => Promise.resolve(e)),
  findByIdempotencyKey: jest.fn().mockResolvedValue(null),
});

const makePublisher = (): jest.Mocked<IFillEventPublisher> => ({
  publishFill: jest.fn().mockResolvedValue(undefined),
});

const buyOrder = (limitPrice: number): PendingLimitOrder => ({
  orderId: 'order-buy-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  quantity: 10,
  limitPrice,
});

const sellOrder = (limitPrice: number): PendingLimitOrder => ({
  orderId: 'order-sell-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.SELL,
  quantity: 5,
  limitPrice,
});

const makeQueue = (orders: PendingLimitOrder[]): jest.Mocked<ILimitOrderQueue> => ({
  add: jest.fn(),
  remove: jest.fn(),
  getBySymbol: jest.fn().mockReturnValue(orders),
});

// ─── BUY limit: fills when market ≤ limitPrice ───────────────────────────────

describe('Given a queued BUY limit order', () => {
  describe('when the market price falls to or below the limit price', () => {
    it('should fill at the market tick price (not at limitPrice)', async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const order = buyOrder(150);
      const queue = makeQueue([order]);

      // market=148 ≤ limit=150 → condition met
      await new MatchLimitOrdersUseCase(queue, repo, publisher).execute('AAPL', 148);

      expect(repo.save).toHaveBeenCalledTimes(1);
      const saved: Execution = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.fillPrice).toBe(148);   // market tick price — price improvement vs limit of 150
      expect(saved.filledQuantity).toBe(10);
      expect(saved.orderId).toBe('order-buy-1');
    });

    it('should remove the order from the queue after filling', async () => {
      const order = buyOrder(150);
      const queue = makeQueue([order]);

      await new MatchLimitOrdersUseCase(queue, makeRepo(), makePublisher()).execute('AAPL', 148);

      expect(queue.remove).toHaveBeenCalledWith('order-buy-1');
    });

    it('should publish a fill event', async () => {
      const publisher = makePublisher();
      const queue = makeQueue([buyOrder(150)]);

      await new MatchLimitOrdersUseCase(queue, makeRepo(), publisher).execute('AAPL', 148);

      expect(publisher.publishFill).toHaveBeenCalledTimes(1);
      expect(publisher.publishFill).toHaveBeenCalledWith(
        expect.objectContaining({ fillPrice: 148, orderId: 'order-buy-1' }),
      );
    });
  });

  describe('when the market price is still above the limit price', () => {
    it('should NOT fill — order stays queued', async () => {
      const repo = makeRepo();
      const queue = makeQueue([buyOrder(150)]);

      // market=155 > limit=150 → condition NOT met
      await new MatchLimitOrdersUseCase(queue, repo, makePublisher()).execute('AAPL', 155);

      expect(repo.save).not.toHaveBeenCalled();
      expect(queue.remove).not.toHaveBeenCalled();
    });
  });
});

// ─── SELL limit: fills when market ≥ limitPrice ──────────────────────────────

describe('Given a queued SELL limit order', () => {
  describe('when the market price rises to or above the limit price', () => {
    it('should fill at the market tick price (not at limitPrice)', async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const queue = makeQueue([sellOrder(180)]);

      // market=182 ≥ limit=180 → condition met
      await new MatchLimitOrdersUseCase(queue, repo, publisher).execute('AAPL', 182);

      expect(repo.save).toHaveBeenCalledTimes(1);
      const saved: Execution = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.fillPrice).toBe(182);   // market tick price — price improvement vs limit of 180
      expect(saved.orderId).toBe('order-sell-1');
    });
  });

  describe('when the market price is still below the limit price', () => {
    it('should NOT fill — order stays queued', async () => {
      const repo = makeRepo();
      const queue = makeQueue([sellOrder(180)]);

      // market=175 < limit=180 → condition NOT met
      await new MatchLimitOrdersUseCase(queue, repo, makePublisher()).execute('AAPL', 175);

      expect(repo.save).not.toHaveBeenCalled();
      expect(queue.remove).not.toHaveBeenCalled();
    });
  });
});

// ─── Mixed orders — only matching ones fill ───────────────────────────────────

describe('Given multiple queued orders at different limit prices', () => {
  it('should only fill orders whose condition is met by the current tick', async () => {
    const repo = makeRepo();
    const publisher = makePublisher();
    const orders: PendingLimitOrder[] = [
      { ...buyOrder(150), orderId: 'buy-150' },
      { ...buyOrder(145), orderId: 'buy-145' }, // not met: 148 > 145 is false... wait 148 ≤ 145? no
      { ...buyOrder(148), orderId: 'buy-148' },  // exactly at limit
    ];
    // market=148: fills buy-150 (148≤150 ✓) and buy-148 (148≤148 ✓), NOT buy-145 (148>145 so 148≤145 is false)
    const queue = makeQueue(orders);

    await new MatchLimitOrdersUseCase(queue, repo, publisher).execute('AAPL', 148);

    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(queue.remove).toHaveBeenCalledWith('buy-150');
    expect(queue.remove).toHaveBeenCalledWith('buy-148');
    expect(queue.remove).not.toHaveBeenCalledWith('buy-145');
  });
});

// ─── Publisher failure doesn't abort remaining fills ─────────────────────────

describe('Given a fill event publisher that throws', () => {
  it('should still process all matching orders — execution persisted even if publish fails', async () => {
    const repo = makeRepo();
    const publisher: jest.Mocked<IFillEventPublisher> = {
      publishFill: jest.fn().mockRejectedValue(new Error('broker unavailable')),
    };
    const queue = makeQueue([buyOrder(150), { ...buyOrder(150), orderId: 'order-buy-2' }]);

    await expect(
      new MatchLimitOrdersUseCase(queue, repo, publisher).execute('AAPL', 148),
    ).resolves.toBeUndefined();

    expect(repo.save).toHaveBeenCalledTimes(2);
  });
});
