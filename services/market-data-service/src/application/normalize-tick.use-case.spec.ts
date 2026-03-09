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

describe('NormalizeTickUseCase', () => {
  it('returns Tick for valid input', () => {
    const metrics = makeMetrics();
    const uc = new NormalizeTickUseCase(metrics);
    const tick = uc.execute(VALID_RAW);
    expect(tick).not.toBeNull();
    expect(tick?.symbol).toBe('AAPL');
  });

  it('returns null and increments rejected counter for invalid input', () => {
    const metrics = makeMetrics();
    const uc = new NormalizeTickUseCase(metrics);
    const tick = uc.execute({ symbol: '', bid: -1 });
    expect(tick).toBeNull();
    expect(metrics.incrementRejected).toHaveBeenCalledTimes(1);
    expect(metrics.incrementEmitted).not.toHaveBeenCalled();
  });

  it('returns null for non-object input', () => {
    const metrics = makeMetrics();
    const uc = new NormalizeTickUseCase(metrics);
    expect(uc.execute(null)).toBeNull();
    expect(metrics.incrementRejected).toHaveBeenCalledTimes(1);
  });

  it('does not swallow non-validation errors', () => {
    const metrics = makeMetrics();
    const uc = new NormalizeTickUseCase(metrics);
    // Force a non-TickValidationError by passing a getter that throws
    const trap = Object.defineProperty({}, 'symbol', {
      get() { throw new RangeError('unexpected'); },
    });
    expect(() => uc.execute(trap)).toThrow(RangeError);
  });
});
