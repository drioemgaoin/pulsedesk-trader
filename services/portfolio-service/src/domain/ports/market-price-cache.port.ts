export const MARKET_PRICE_CACHE = Symbol('IMarketPriceCache');

export interface IMarketPriceCache {
  getPrice(symbol: string): number | null;
  setPrice(symbol: string, price: number): void;
}
