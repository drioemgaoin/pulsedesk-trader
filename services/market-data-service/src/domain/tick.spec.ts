import { Tick, TickValidationError } from './tick';

describe('Tick.create', () => {
  const valid = {
    symbol: 'aapl',
    bid: 174.99,
    ask: 175.01,
    last: 175.0,
    volume: 5000,
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  it('creates a valid tick and normalises symbol to uppercase', () => {
    const tick = Tick.create(valid);
    expect(tick.symbol).toBe('AAPL');
    expect(tick.bid).toBe(174.99);
    expect(tick.ask).toBe(175.01);
    expect(tick.last).toBe(175.0);
    expect(tick.volume).toBe(5000);
  });

  it('defaults timestamp when omitted', () => {
    const noTs = { symbol: valid.symbol, bid: valid.bid, ask: valid.ask, last: valid.last, volume: valid.volume };
    const tick = Tick.create(noTs);
    expect(typeof tick.timestamp).toBe('string');
  });

  it('throws on non-object input', () => {
    expect(() => Tick.create(null)).toThrow(TickValidationError);
    expect(() => Tick.create('string')).toThrow(TickValidationError);
  });

  it('throws on empty symbol', () => {
    expect(() => Tick.create({ ...valid, symbol: '  ' })).toThrow(TickValidationError);
  });

  it('throws on negative bid', () => {
    expect(() => Tick.create({ ...valid, bid: -1 })).toThrow(TickValidationError);
  });

  it('throws when bid > ask', () => {
    expect(() => Tick.create({ ...valid, bid: 176, ask: 175 })).toThrow(TickValidationError);
  });

  it('throws on non-finite volume', () => {
    expect(() => Tick.create({ ...valid, volume: Infinity })).toThrow(TickValidationError);
  });

  it('toMarketEvent maps all fields correctly', () => {
    const tick = Tick.create(valid);
    const event = tick.toMarketEvent();
    expect(event.eventType).toBe('market.tick');
    expect(event.schemaVersion).toBe(1);
    expect(event.symbol).toBe('AAPL');
  });
});
