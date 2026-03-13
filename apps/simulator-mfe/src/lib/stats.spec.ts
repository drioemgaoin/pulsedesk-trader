import { describe, it, expect } from 'vitest';
import {
  emptyStats,
  applyUpdate,
  avgFillLatency,
  acceptanceRate,
  fillRate,
  rejectionRate,
} from './stats';

describe('emptyStats', () => {
  it('Should return all-zero counters', () => {
    const s = emptyStats();
    expect(s.submitted).toBe(0);
    expect(s.accepted).toBe(0);
    expect(s.filled).toBe(0);
    expect(s.rejected).toBe(0);
    expect(s.errored).toBe(0);
    expect(s.errorBreakdown.size).toBe(0);
  });
});

describe('applyUpdate', () => {
  it('Given accepted update, Should increment submitted and accepted', () => {
    const s = applyUpdate(emptyStats(), { type: 'accepted' });
    expect(s.submitted).toBe(1);
    expect(s.accepted).toBe(1);
    expect(s.filled).toBe(0);
  });

  it('Given filled update, Should increment submitted, accepted, and filled', () => {
    const s = applyUpdate(emptyStats(), { type: 'filled', latencyMs: 42 });
    expect(s.submitted).toBe(1);
    expect(s.accepted).toBe(1);
    expect(s.filled).toBe(1);
    expect(s.fillLatencySum).toBe(42);
    expect(s.fillLatencyCount).toBe(1);
  });

  it('Given rejected update with error key, Should increment rejected and error breakdown', () => {
    const s = applyUpdate(emptyStats(), { type: 'rejected', errorKey: '422|QUANTITY_LIMIT_EXCEEDED' });
    expect(s.submitted).toBe(1);
    expect(s.rejected).toBe(1);
    expect(s.errorBreakdown.get('422|QUANTITY_LIMIT_EXCEEDED')).toBe(1);
  });

  it('Given multiple updates with same error key, Should accumulate count', () => {
    let s = emptyStats();
    s = applyUpdate(s, { type: 'rejected', errorKey: '422|RISK' });
    s = applyUpdate(s, { type: 'rejected', errorKey: '422|RISK' });
    s = applyUpdate(s, { type: 'rejected', errorKey: '422|RISK' });
    expect(s.errorBreakdown.get('422|RISK')).toBe(3);
  });

  it('Given errored update, Should increment errored counter', () => {
    const s = applyUpdate(emptyStats(), { type: 'errored', errorKey: '500|ERR' });
    expect(s.errored).toBe(1);
    expect(s.submitted).toBe(1);
  });

  it('Should not mutate original stats', () => {
    const original = emptyStats();
    applyUpdate(original, { type: 'accepted' });
    expect(original.submitted).toBe(0);
  });
});

describe('avgFillLatency', () => {
  it('Given no fills, Should return null', () => {
    expect(avgFillLatency(emptyStats())).toBeNull();
  });

  it('Given two fills, Should return mean latency', () => {
    let s = emptyStats();
    s = applyUpdate(s, { type: 'filled', latencyMs: 100 });
    s = applyUpdate(s, { type: 'filled', latencyMs: 200 });
    expect(avgFillLatency(s)).toBe(150);
  });
});

describe('rate calculations', () => {
  it('Given zero submitted, Should return 0 for all rates', () => {
    const s = emptyStats();
    expect(acceptanceRate(s)).toBe(0);
    expect(fillRate(s)).toBe(0);
    expect(rejectionRate(s)).toBe(0);
  });

  it('Given 4 submitted: 3 accepted, 2 filled, 1 rejected, Should compute correct rates', () => {
    let s = emptyStats();
    s = applyUpdate(s, { type: 'filled', latencyMs: 10 });
    s = applyUpdate(s, { type: 'filled', latencyMs: 10 });
    s = applyUpdate(s, { type: 'accepted' });
    s = applyUpdate(s, { type: 'rejected', errorKey: '422|X' });

    expect(acceptanceRate(s)).toBeCloseTo(3 / 4);
    expect(fillRate(s)).toBeCloseTo(2 / 4);
    expect(rejectionRate(s)).toBeCloseTo(1 / 4);
  });
});
