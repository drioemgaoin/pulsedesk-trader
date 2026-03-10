import { GetWatchlistUseCase } from './get-watchlist.use-case';
import type { ITickStore } from '../domain/ports/tick-store.port';
import { Tick } from '../domain/tick';

const makeTick = (symbol: string): Tick =>
  Tick.create({ symbol, bid: 1.0, ask: 1.01, last: 1.005, volume: 100 });

describe('Given a GetWatchlistUseCase instance', () => {
  describe('when execute is called and the store is empty', () => {
    it('should return an empty quotes array with a valid asOf timestamp', () => {
      const store: ITickStore = {
        upsert: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
        get: jest.fn(),
        size: jest.fn().mockReturnValue(0),
      };
      const result = new GetWatchlistUseCase(store).execute();
      expect(result.quotes).toHaveLength(0);
      expect(typeof result.asOf).toBe('string');
    });
  });

  describe('when execute is called and the store contains ticks', () => {
    it('should return one quote per tick in store order', () => {
      const ticks = [makeTick('AAPL'), makeTick('MSFT')];
      const store: ITickStore = {
        upsert: jest.fn(),
        getAll: jest.fn().mockReturnValue(ticks),
        get: jest.fn(),
        size: jest.fn().mockReturnValue(2),
      };
      const result = new GetWatchlistUseCase(store).execute();
      expect(result.quotes).toHaveLength(2);
      expect(result.quotes[0].symbol).toBe('AAPL');
      expect(result.quotes[1].symbol).toBe('MSFT');
    });
  });
});
