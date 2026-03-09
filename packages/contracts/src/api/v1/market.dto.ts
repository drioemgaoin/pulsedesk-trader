// API v1 — Market data DTOs

export interface MarketQuoteV1 {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}

export interface WatchlistResponseV1 {
  quotes: MarketQuoteV1[];
  asOf: string;
}
