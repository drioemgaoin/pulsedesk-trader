import { ProcessTickUseCase } from './process-tick.use-case';
import type { ITickStore } from '../domain/ports/tick-store.port';
import type { ITickPublisher } from '../domain/ports/tick-publisher.port';
import type { ITickMetrics } from './ports/metrics.port';
import { Tick } from '../domain/tick';

const makeTick = (): Tick =>
  Tick.create({ symbol: 'AAPL', bid: 174.99, ask: 175.01, last: 175.0, volume: 1000 });

describe('Given a ProcessTickUseCase instance', () => {
  const store: jest.Mocked<ITickStore> = {
    upsert: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn(),
    size: jest.fn(),
  };
  const publisher: jest.Mocked<ITickPublisher> = {
    publish: jest.fn().mockResolvedValue(undefined),
  };
  const metrics: jest.Mocked<ITickMetrics> = {
    incrementEmitted: jest.fn(),
    incrementRejected: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  describe('when execute is called with a valid tick', () => {
    it('should upsert to the store, publish the tick, and increment the emitted counter', async () => {
      const uc = new ProcessTickUseCase(store, publisher, metrics);
      const tick = makeTick();
      await uc.execute(tick);
      expect(store.upsert).toHaveBeenCalledWith(tick);
      expect(publisher.publish).toHaveBeenCalledWith(tick, expect.any(Number));
      expect(metrics.incrementEmitted).toHaveBeenCalledTimes(1);
    });

    it('should compute a partition key in the valid range [0, 10)', async () => {
      const uc = new ProcessTickUseCase(store, publisher, metrics);
      await uc.execute(makeTick());
      const key = (publisher.publish as jest.Mock).mock.calls[0][1] as number;
      expect(key).toBeGreaterThanOrEqual(0);
      expect(key).toBeLessThan(10);
    });
  });
});
