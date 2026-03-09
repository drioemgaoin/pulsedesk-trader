import { InMemoryTickStore } from './in-memory-tick-store';
import { Tick } from '../../domain/tick';

const makeTick = (symbol: string): Tick =>
  Tick.create({ symbol, bid: 1.0, ask: 1.01, last: 1.005, volume: 100 });

describe('InMemoryTickStore', () => {
  it('starts empty', () => {
    const store = new InMemoryTickStore();
    expect(store.getAll()).toHaveLength(0);
    expect(store.size()).toBe(0);
  });

  it('upserts and retrieves by symbol', () => {
    const store = new InMemoryTickStore();
    const tick = makeTick('AAPL');
    store.upsert(tick);
    expect(store.get('AAPL')).toBe(tick);
    expect(store.size()).toBe(1);
  });

  it('overwrites on second upsert for same symbol', () => {
    const store = new InMemoryTickStore();
    store.upsert(makeTick('AAPL'));
    const updated = makeTick('AAPL');
    store.upsert(updated);
    expect(store.get('AAPL')).toBe(updated);
    expect(store.size()).toBe(1);
  });

  it('stores multiple symbols independently', () => {
    const store = new InMemoryTickStore();
    store.upsert(makeTick('AAPL'));
    store.upsert(makeTick('MSFT'));
    expect(store.getAll()).toHaveLength(2);
    expect(store.get('MSFT')).toBeDefined();
  });

  it('returns undefined for unknown symbol', () => {
    expect(new InMemoryTickStore().get('UNKNOWN')).toBeUndefined();
  });
});
