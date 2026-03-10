import { Injectable } from '@nestjs/common';
import { IMarketPriceCache } from '../../domain/ports/market-price-cache.port';

@Injectable()
export class InMemoryMarketPriceCache implements IMarketPriceCache {
  private readonly prices = new Map<string, number>();

  getPrice(symbol: string): number | null {
    return this.prices.get(symbol) ?? null;
  }

  setPrice(symbol: string, price: number): void {
    this.prices.set(symbol, price);
  }
}
