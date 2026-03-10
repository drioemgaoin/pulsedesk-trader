export class NoMarketPriceError extends Error {
  constructor(symbol: string) {
    super(`no market price available for symbol: ${symbol}`);
    this.name = 'NoMarketPriceError';
  }
}
