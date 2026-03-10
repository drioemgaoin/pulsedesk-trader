import { InMemoryMarketPriceCache } from './in-memory-market-price-cache';

describe('Given an InMemoryMarketPriceCache', () => {
  describe('when getPrice is called for an unknown symbol', () => {
    it('should return null', () => {
      expect(new InMemoryMarketPriceCache().getPrice('AAPL')).toBeNull();
    });
  });

  describe('when setPrice is called then getPrice is called for the same symbol', () => {
    it('should return the stored price', () => {
      const cache = new InMemoryMarketPriceCache();
      cache.setPrice('AAPL', 155.5);
      expect(cache.getPrice('AAPL')).toBe(155.5);
    });
  });

  describe('when setPrice is called twice for the same symbol', () => {
    it('should return the latest price', () => {
      const cache = new InMemoryMarketPriceCache();
      cache.setPrice('AAPL', 150);
      cache.setPrice('AAPL', 160);
      expect(cache.getPrice('AAPL')).toBe(160);
    });
  });
});
