import { symbolPartitionKey } from './partition-key';

describe('symbolPartitionKey', () => {
  it('returns a value in [0, partitions)', () => {
    const partitions = 10;
    for (const symbol of ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']) {
      const key = symbolPartitionKey(symbol, partitions);
      expect(key).toBeGreaterThanOrEqual(0);
      expect(key).toBeLessThan(partitions);
    }
  });

  it('is deterministic — same input always yields same output', () => {
    expect(symbolPartitionKey('AAPL', 10)).toBe(symbolPartitionKey('AAPL', 10));
    expect(symbolPartitionKey('MSFT', 32)).toBe(symbolPartitionKey('MSFT', 32));
  });

  it('distributes different symbols across partitions', () => {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX'];
    const keys = new Set(symbols.map(s => symbolPartitionKey(s, 10)));
    // With 8 symbols and 10 partitions, expect at least 4 distinct partition assignments
    expect(keys.size).toBeGreaterThanOrEqual(4);
  });
});
