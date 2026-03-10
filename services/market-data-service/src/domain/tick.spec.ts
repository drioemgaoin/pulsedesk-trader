import { Tick, TickValidationError } from './tick';

describe('Given a valid tick payload', () => {
  const valid = {
    symbol: 'aapl',
    bid: 174.99,
    ask: 175.01,
    last: 175.0,
    volume: 5000,
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  describe('when Tick.create is called', () => {
    it('should normalise the symbol to uppercase', () => {
      const tick = Tick.create(valid);
      expect(tick.symbol).toBe('AAPL');
      expect(tick.bid).toBe(174.99);
      expect(tick.ask).toBe(175.01);
      expect(tick.last).toBe(175.0);
      expect(tick.volume).toBe(5000);
    });

    it('should default the timestamp when it is omitted', () => {
      const noTs = { symbol: valid.symbol, bid: valid.bid, ask: valid.ask, last: valid.last, volume: valid.volume };
      const tick = Tick.create(noTs);
      expect(typeof tick.timestamp).toBe('string');
    });

    it('should map all fields correctly in toMarketEvent', () => {
      const tick = Tick.create(valid);
      const event = tick.toMarketEvent();
      expect(event.eventType).toBe('market.tick');
      expect(event.schemaVersion).toBe(1);
      expect(event.symbol).toBe('AAPL');
    });
  });
});

describe('Given an invalid tick payload', () => {
  const valid = {
    symbol: 'aapl',
    bid: 174.99,
    ask: 175.01,
    last: 175.0,
    volume: 5000,
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  describe('when Tick.create is called with a non-object input', () => {
    it('should throw TickValidationError', () => {
      expect(() => Tick.create(null)).toThrow(TickValidationError);
      expect(() => Tick.create('string')).toThrow(TickValidationError);
    });
  });

  describe('when Tick.create is called with an empty symbol', () => {
    it('should throw TickValidationError', () => {
      expect(() => Tick.create({ ...valid, symbol: '  ' })).toThrow(TickValidationError);
    });
  });

  describe('when Tick.create is called with a negative bid', () => {
    it('should throw TickValidationError', () => {
      expect(() => Tick.create({ ...valid, bid: -1 })).toThrow(TickValidationError);
    });
  });

  describe('when Tick.create is called with bid greater than ask', () => {
    it('should throw TickValidationError', () => {
      expect(() => Tick.create({ ...valid, bid: 176, ask: 175 })).toThrow(TickValidationError);
    });
  });

  describe('when Tick.create is called with a non-finite volume', () => {
    it('should throw TickValidationError', () => {
      expect(() => Tick.create({ ...valid, volume: Infinity })).toThrow(TickValidationError);
    });
  });
});
