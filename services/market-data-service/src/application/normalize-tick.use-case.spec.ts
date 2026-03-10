import { NormalizeTickUseCase } from './normalize-tick.use-case';
import type { ITickMetrics } from './ports/metrics.port';

const makeMetrics = (): jest.Mocked<ITickMetrics> => ({
  incrementEmitted: jest.fn(),
  incrementRejected: jest.fn(),
});

const VALID_RAW = {
  symbol: 'AAPL',
  bid: 174.99,
  ask: 175.01,
  last: 175.0,
  volume: 1000,
  timestamp: '2024-01-01T00:00:00.000Z',
};

describe('Given a NormalizeTickUseCase instance', () => {
  describe('when execute is called with a valid tick payload', () => {
    it('should return a normalised Tick with the correct symbol', () => {
      const metrics = makeMetrics();
      const uc = new NormalizeTickUseCase(metrics);
      const tick = uc.execute(VALID_RAW);
      expect(tick).not.toBeNull();
      expect(tick?.symbol).toBe('AAPL');
    });
  });

  describe('when execute is called with an invalid tick payload', () => {
    it('should return null and increment the rejected counter', () => {
      const metrics = makeMetrics();
      const uc = new NormalizeTickUseCase(metrics);
      const tick = uc.execute({ symbol: '', bid: -1 });
      expect(tick).toBeNull();
      expect(metrics.incrementRejected).toHaveBeenCalledTimes(1);
      expect(metrics.incrementEmitted).not.toHaveBeenCalled();
    });

    it('should return null for non-object input', () => {
      const metrics = makeMetrics();
      const uc = new NormalizeTickUseCase(metrics);
      expect(uc.execute(null)).toBeNull();
      expect(metrics.incrementRejected).toHaveBeenCalledTimes(1);
    });
  });

  describe('when execute is called and a non-validation error is thrown', () => {
    it('should rethrow the error without swallowing it', () => {
      const metrics = makeMetrics();
      const uc = new NormalizeTickUseCase(metrics);
      // Force a non-TickValidationError by passing a getter that throws
      const trap = Object.defineProperty({}, 'symbol', {
        get() { throw new RangeError('unexpected'); },
      });
      expect(() => uc.execute(trap)).toThrow(RangeError);
    });
  });
});
