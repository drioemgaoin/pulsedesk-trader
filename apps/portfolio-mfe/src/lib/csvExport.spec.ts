import { describe, it, expect } from 'vitest';
import { buildCsvContent } from './csvExport';
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

describe('buildCsvContent', () => {
  it('Given empty positions, Should return only the header row', () => {
    const csv = buildCsvContent([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Symbol');
    expect(lines[0]).toContain('Quantity');
    expect(lines[0]).toContain('Unrealized PnL');
    expect(lines[0]).toContain('% Return');
  });

  it('Given one position, Should include correct data in the row', () => {
    const p = makePosition({ symbol: 'TSLA', quantity: 50, averageCost: 200, marketPrice: 220, unrealizedPnl: 1000 });
    const csv = buildCsvContent([p]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('TSLA');
    expect(lines[1]).toContain('50');
    expect(lines[1]).toContain('200.00');
    expect(lines[1]).toContain('220.00');
    expect(lines[1]).toContain('1000.00');
  });

  it('Given multiple positions, Should have header + one row per position', () => {
    const positions = [makePosition({ symbol: 'AAPL' }), makePosition({ symbol: 'TSLA' })];
    const csv = buildCsvContent(positions);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('AAPL');
    expect(lines[2]).toContain('TSLA');
  });

  it('Given a position with negative PnL, Should include the negative value', () => {
    const p = makePosition({ unrealizedPnl: -500, marketPrice: 140 });
    const csv = buildCsvContent([p]);
    expect(csv).toContain('-500.00');
  });
});
