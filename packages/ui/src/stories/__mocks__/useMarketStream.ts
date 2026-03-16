// Stub for Storybook — replaces the real useMarketStream hook via Vite alias.
// Returns static snapshot data so stories don't need a real WebSocket server.

export type WsStatus = 'connecting' | 'connected' | 'reconnecting';

export interface MarketTick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}

export interface FillEvent {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  filledQuantity: number;
  fillPrice: number;
  accountId: string;
}

export type WatchlistSnapshot = Record<string, MarketTick>;

export interface UseMarketStreamOptions {
  url: string;
  token: string;
  symbols: string[];
  accountId?: string;
  onFill?: (fill: FillEvent) => void;
}

export interface UseMarketStreamResult {
  snapshot: WatchlistSnapshot;
  status: WsStatus;
}

const NOW = new Date().toISOString();

const SNAPSHOT: WatchlistSnapshot = {
  AAPL: { symbol: 'AAPL', bid: 194.80, ask: 195.10, last: 195.24, volume: 52_341_200, timestamp: NOW },
  TSLA: { symbol: 'TSLA', bid: 241.90, ask: 242.30, last: 242.10, volume: 31_200_400, timestamp: NOW },
  MSFT: { symbol: 'MSFT', bid: 415.60, ask: 416.00, last: 415.80, volume: 18_900_100, timestamp: NOW },
  NVDA: { symbol: 'NVDA', bid: 874.80, ask: 875.50, last: 875.43, volume: 41_500_700, timestamp: NOW },
  AMZN: { symbol: 'AMZN', bid: 182.10, ask: 182.50, last: 182.30, volume: 27_400_600, timestamp: NOW },
};

export function useMarketStream(_options: UseMarketStreamOptions): UseMarketStreamResult {
  return { snapshot: SNAPSHOT, status: 'connected' };
}
