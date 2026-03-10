import { InMemoryTickStore } from './in-memory-tick-store';
import { Tick } from '../../domain/tick';

const makeTick = (symbol: string): Tick =>
  Tick.create({ symbol, bid: 1.0, ask: 1.01, last: 1.005, volume: 100 });

describe('Given an InMemoryTickStore instance', () => {
  describe('when the store has just been created', () => {
    it('should be empty', () => {
      const store = new InMemoryTickStore();
      expect(store.getAll()).toHaveLength(0);
      expect(store.size()).toBe(0);
    });
  });

  describe('when a tick is upserted', () => {
    it('should be retrievable by symbol', () => {
      const store = new InMemoryTickStore();
      const tick = makeTick('AAPL');
      store.upsert(tick);
      expect(store.get('AAPL')).toBe(tick);
      expect(store.size()).toBe(1);
    });

    it('should overwrite the previous entry for the same symbol', () => {
      const store = new InMemoryTickStore();
      store.upsert(makeTick('AAPL'));
      const updated = makeTick('AAPL');
      store.upsert(updated);
      expect(store.get('AAPL')).toBe(updated);
      expect(store.size()).toBe(1);
    });
  });

  describe('when multiple different symbols are upserted', () => {
    it('should store each symbol independently', () => {
      const store = new InMemoryTickStore();
      store.upsert(makeTick('AAPL'));
      store.upsert(makeTick('MSFT'));
      expect(store.getAll()).toHaveLength(2);
      expect(store.get('MSFT')).toBeDefined();
    });
  });

  describe('when get is called for an unknown symbol', () => {
    it('should return undefined', () => {
      expect(new InMemoryTickStore().get('UNKNOWN')).toBeUndefined();
    });
  });
});
