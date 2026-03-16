/**
 * Storybook stub for useMarketStream — replaces the real WebSocket hook.
 * Aliased via viteFinal in .storybook/main.ts so no story imports this directly.
 *
 * Returns a fully-built static snapshot on the first render — no timers, no ticking.
 * Prices, chart data, and watchlist are fixed for the entire lifetime of the story.
 */
import { useState } from 'react';

export interface MarketTick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
  history?: Array<{ timestamp: string; last: number }>;
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
export type WsStatus = 'connecting' | 'connected' | 'reconnecting';

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

// ─── Deterministic price history ──────────────────────────────────────────────

const TICK_COUNT = 25;

/** LCG pseudo-random, seeded — same sequence on every Storybook reload */
function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

function generatePrices(base: number, volatility: number, seed: number): number[] {
  const rng = seededRng(seed);
  const prices: number[] = [base];
  for (let i = 1; i < TICK_COUNT; i++) {
    const delta = (rng() - 0.48) * volatility; // slight upward drift
    prices.push(Math.max(0.01, Number((prices[i - 1]! + delta).toFixed(2))));
  }
  return prices;
}

// Pre-computed price series — deterministic, same values every reload
const PRICE_SERIES: Record<string, number[]> = {
  AAPL: generatePrices(178.32, 0.55, 1001),
  TSLA: generatePrices(242.30, 2.10, 1002),
  MSFT: generatePrices(415.82, 1.70, 1003),
  NVDA: generatePrices(875.65, 5.50, 1004),
  AMZN: generatePrices(187.45, 0.85, 1005),
};

// Fixed base timestamp: Jan 2 2024 09:30 NYSE open — realistic time axis
const BASE_UNIX_S = 1704195000;

const VOLUMES: Record<string, number> = {
  AAPL: 52_341_200,
  TSLA: 31_882_400,
  MSFT: 18_440_100,
  NVDA: 44_215_300,
  AMZN: 27_663_800,
};

function buildSnapshot(symbols: string[], tickIndex: number): WatchlistSnapshot {
  const snap: WatchlistSnapshot = {};
  for (const sym of symbols) {
    const series = PRICE_SERIES[sym];
    if (!series) continue;
    const i = Math.min(tickIndex, series.length - 1);
    const last = series[i]!;
    snap[sym] = {
      symbol: sym,
      bid: Number((last - 0.13).toFixed(2)),
      ask: Number((last + 0.13).toFixed(2)),
      last,
      volume: VOLUMES[sym] ?? 10_000_000,
      // Timestamps are 5 minutes apart — realistic intraday spacing on the chart axis
      timestamp: new Date((BASE_UNIX_S + i * 300) * 1000).toISOString(),
      // Provide full history so the chart can render a complete static curve.
      history: series.slice(0, i + 1).map((p, idx) => ({
        timestamp: new Date((BASE_UNIX_S + idx * 300) * 1000).toISOString(),
        last: p,
      })),
    };
  }
  return snap;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketStream({ symbols }: UseMarketStreamOptions): UseMarketStreamResult {
  // Build the full snapshot at the last tick index immediately — no timers, no updates.
  const [snapshot] = useState<WatchlistSnapshot>(() =>
    buildSnapshot(symbols, TICK_COUNT - 1),
  );

  return { snapshot, status: 'connected' };
}
