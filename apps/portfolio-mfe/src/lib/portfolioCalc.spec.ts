import { describe, it, expect } from 'vitest';
import { computeSummary, sortPositions, pctReturn } from './portfolioCalc';
import type { PositionV1 } from '../api/types';

const makePosition = (overrides: Partial<PositionV1> = {}): PositionV1 => ({
  accountId: 'acc-001',
  symbol: 'AAPL',
  quantity: 100,
  averageCost: 150,
  marketPrice: 160,
  unrealizedPnl: 1000,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('pctReturn', () => {
  it('Given a position, When marketPrice > averageCost, Should return positive percentage', () => {
    const p = makePosition({ averageCost: 100, marketPrice: 120 });
    expect(pctReturn(p)).toBeCloseTo(20);
  });

  it('Given a position, When marketPrice < averageCost, Should return negative percentage', () => {
    const p = makePosition({ averageCost: 100, marketPrice: 80 });
    expect(pctReturn(p)).toBeCloseTo(-20);
  });

  it('Given averageCost of zero, Should return 0 without dividing by zero', () => {
    const p = makePosition({ averageCost: 0, marketPrice: 50 });
    expect(pctReturn(p)).toBe(0);
  });
});

describe('computeSummary', () => {
  it('Given empty positions, Should return zeroed summary', () => {
    const s = computeSummary([]);
    expect(s).toEqual({ positionCount: 0, totalMarketValue: 0, totalUnrealizedPnl: 0 });
  });

  it('Given multiple positions, Should compute correct aggregates', () => {
    const positions = [
      makePosition({ symbol: 'AAPL', quantity: 100, marketPrice: 160, unrealizedPnl: 1000 }),
      makePosition({ symbol: 'TSLA', quantity: 50, marketPrice: 200, unrealizedPnl: -500 }),
    ];
    const s = computeSummary(positions);
    expect(s.positionCount).toBe(2);
    expect(s.totalMarketValue).toBe(100 * 160 + 50 * 200); // 26_000
    expect(s.totalUnrealizedPnl).toBe(1000 + (-500)); // 500
  });
});

describe('sortPositions', () => {
  const positions = [
    makePosition({ symbol: 'TSLA', quantity: 50, averageCost: 200, marketPrice: 220, unrealizedPnl: 1000 }),
    makePosition({ symbol: 'AAPL', quantity: 100, averageCost: 150, marketPrice: 160, unrealizedPnl: 500 }),
    makePosition({ symbol: 'MSFT', quantity: 20, averageCost: 300, marketPrice: 280, unrealizedPnl: -400 }),
  ];

  it('Given sort by symbol asc, Should return alphabetical order', () => {
    const sorted = sortPositions(positions, { key: 'symbol', direction: 'asc' });
    expect(sorted.map((p) => p.symbol)).toEqual(['AAPL', 'MSFT', 'TSLA']);
  });

  it('Given sort by symbol desc, Should return reverse alphabetical', () => {
    const sorted = sortPositions(positions, { key: 'symbol', direction: 'desc' });
    expect(sorted.map((p) => p.symbol)).toEqual(['TSLA', 'MSFT', 'AAPL']);
  });

  it('Given sort by unrealizedPnl asc, Should order from lowest to highest', () => {
    const sorted = sortPositions(positions, { key: 'unrealizedPnl', direction: 'asc' });
    expect(sorted[0]?.symbol).toBe('MSFT'); // -400
    expect(sorted[2]?.symbol).toBe('TSLA'); // 1000
  });

  it('Given sort by pctReturn desc, Should order by percentage return highest first', () => {
    // AAPL: (160-150)/150 = 6.67%, TSLA: (220-200)/200 = 10%, MSFT: (280-300)/300 = -6.67%
    const sorted = sortPositions(positions, { key: 'pctReturn', direction: 'desc' });
    expect(sorted[0]?.symbol).toBe('TSLA');
    expect(sorted[2]?.symbol).toBe('MSFT');
  });

  it('Should not mutate the original array', () => {
    const original = [...positions];
    sortPositions(positions, { key: 'quantity', direction: 'asc' });
    expect(positions).toEqual(original);
  });
});
