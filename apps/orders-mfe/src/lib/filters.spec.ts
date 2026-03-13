import { describe, it, expect } from 'vitest';
import { buildQueryString, hasActiveFilters, DEFAULT_FILTERS } from './filters';
import type { OrderFilters } from './filters';

const base: OrderFilters = { ...DEFAULT_FILTERS };

describe('buildQueryString', () => {
  it('Given defaults, Should include accountId, limit and offset', () => {
    const qs = buildQueryString('acc-001', 0, base);
    expect(qs).toContain('accountId=acc-001');
    expect(qs).toContain('limit=25');
    expect(qs).toContain('offset=0');
  });

  it('Given page 2, Should set offset to 50', () => {
    const qs = buildQueryString('acc-001', 2, base);
    expect(qs).toContain('offset=50');
  });

  it('Given single status filter, Should include status param', () => {
    const filters: OrderFilters = { ...base, statuses: ['FILLED'] };
    const qs = buildQueryString('acc-001', 0, filters);
    expect(qs).toContain('status=FILLED');
  });

  it('Given multiple statuses, Should not include status param (server not supported)', () => {
    const filters: OrderFilters = { ...base, statuses: ['FILLED', 'PENDING'] };
    const qs = buildQueryString('acc-001', 0, filters);
    expect(qs).not.toContain('status=');
  });

  it('Given side BUY, Should include side param', () => {
    const filters: OrderFilters = { ...base, side: 'BUY' };
    const qs = buildQueryString('acc-001', 0, filters);
    expect(qs).toContain('side=BUY');
  });

  it('Given side ALL, Should not include side param', () => {
    const qs = buildQueryString('acc-001', 0, base);
    expect(qs).not.toContain('side=');
  });

  it('Given date range, Should include from and to params', () => {
    const filters: OrderFilters = { ...base, dateFrom: '2024-01-01', dateTo: '2024-12-31' };
    const qs = buildQueryString('acc-001', 0, filters);
    expect(qs).toContain('from=2024-01-01');
    expect(qs).toContain('to=2024-12-31');
  });
});

describe('hasActiveFilters', () => {
  it('Given default filters, Should return false', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it('Given status filter, Should return true', () => {
    expect(hasActiveFilters({ ...base, statuses: ['FILLED'] })).toBe(true);
  });

  it('Given side filter, Should return true', () => {
    expect(hasActiveFilters({ ...base, side: 'BUY' })).toBe(true);
  });

  it('Given symbol filter, Should return true', () => {
    expect(hasActiveFilters({ ...base, symbols: ['AAPL'] })).toBe(true);
  });

  it('Given dateFrom, Should return true', () => {
    expect(hasActiveFilters({ ...base, dateFrom: '2024-01-01' })).toBe(true);
  });
});
