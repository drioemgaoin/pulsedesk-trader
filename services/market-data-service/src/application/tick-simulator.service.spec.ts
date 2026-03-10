import { TickSimulatorService } from './tick-simulator.service';
import { NormalizeTickUseCase } from './normalize-tick.use-case';
import { ProcessTickUseCase } from './process-tick.use-case';

const makeNormalize = (): jest.Mocked<NormalizeTickUseCase> =>
  ({ execute: jest.fn().mockImplementation(raw => {
    // Return a minimal Tick-like object for valid raws
    if (raw && typeof raw === 'object' && 'symbol' in (raw as object)) {
      return raw; // pass-through for test — real validation covered separately
    }
    return null;
  }) } as unknown as jest.Mocked<NormalizeTickUseCase>);

const makeProcess = (): jest.Mocked<ProcessTickUseCase> =>
  ({ execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<ProcessTickUseCase>);

describe('Given a TickSimulatorService instance', () => {
  beforeEach(() => {
    process.env['MARKET_DATA_SYMBOLS'] = 'AAPL,MSFT';
    process.env['MARKET_DATA_TICK_INTERVAL_MS'] = '100';
  });

  afterEach(() => {
    delete process.env['MARKET_DATA_SYMBOLS'];
    delete process.env['MARKET_DATA_TICK_INTERVAL_MS'];
  });

  describe('when onModuleInit is called', () => {
    it('should start emitting ticks and stop when onModuleDestroy is called', async () => {
      jest.useFakeTimers();
      const normalize = makeNormalize();
      const proc = makeProcess();
      const svc = new TickSimulatorService(normalize, proc);

      svc.onModuleInit();
      jest.advanceTimersByTime(250); // 2+ intervals
      await Promise.resolve(); // flush async
      expect(proc.execute).toHaveBeenCalled();

      svc.onModuleDestroy();
      const callCount = (proc.execute as jest.Mock).mock.calls.length;
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect((proc.execute as jest.Mock).mock.calls.length).toBe(callCount); // no more calls after destroy

      jest.useRealTimers();
    });
  });

  describe('when MARKET_DATA_SYMBOLS env is set', () => {
    it('should read the configured symbols from the environment', () => {
      const svc = new TickSimulatorService(makeNormalize(), makeProcess());
      // @ts-expect-error accessing private for test
      expect(svc.symbols).toEqual(['AAPL', 'MSFT']);
    });
  });

  describe('when MARKET_DATA_SYMBOLS and MARKET_DATA_TICK_INTERVAL_MS are not set', () => {
    it('should use default symbols and a 500ms interval', () => {
      delete process.env['MARKET_DATA_SYMBOLS'];
      delete process.env['MARKET_DATA_TICK_INTERVAL_MS'];
      const svc = new TickSimulatorService(makeNormalize(), makeProcess());
      // @ts-expect-error accessing private for test
      expect(svc.symbols.length).toBeGreaterThan(0);
      // @ts-expect-error accessing private for test
      expect(svc.intervalMs).toBe(500);
    });
  });

  describe('when normalize returns null for a tick', () => {
    it('should skip the process step for that tick', async () => {
      jest.useFakeTimers();
      const normalize = { execute: jest.fn().mockReturnValue(null) } as unknown as NormalizeTickUseCase;
      const proc = makeProcess();
      const svc = new TickSimulatorService(normalize, proc);
      svc.onModuleInit();
      jest.advanceTimersByTime(150);
      await Promise.resolve();
      expect(proc.execute).not.toHaveBeenCalled();
      svc.onModuleDestroy();
      jest.useRealTimers();
    });
  });

  describe('when onModuleDestroy is called before onModuleInit', () => {
    it('should not throw', () => {
      const svc = new TickSimulatorService(makeNormalize(), makeProcess());
      expect(() => svc.onModuleDestroy()).not.toThrow();
    });
  });
});
