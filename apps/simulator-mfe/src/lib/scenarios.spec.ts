import { describe, it, expect } from 'vitest';
import { buildOrderPayload, makeDuplicateKey } from './scenarios';

const SYMBOLS = ['AAPL', 'TSLA'];
const ACCOUNT = 'acc-001';

describe('buildOrderPayload', () => {
  it('Given Normal scenario, Should return quantity 1–50', () => {
    for (let i = 0; i < 20; i++) {
      const p = buildOrderPayload('Normal', SYMBOLS, ACCOUNT);
      expect(p.quantity).toBeGreaterThanOrEqual(1);
      expect(p.quantity).toBeLessThanOrEqual(50);
      expect(SYMBOLS).toContain(p.symbol);
      expect(['BUY', 'SELL']).toContain(p.side);
    }
  });

  it('Given HighVolume scenario, Should return quantity 800–999', () => {
    for (let i = 0; i < 10; i++) {
      const p = buildOrderPayload('HighVolume', SYMBOLS, ACCOUNT);
      expect(p.quantity).toBeGreaterThanOrEqual(800);
      expect(p.quantity).toBeLessThanOrEqual(999);
    }
  });

  it('Given LimitExceeded scenario, Should return quantity >= 1001', () => {
    for (let i = 0; i < 10; i++) {
      const p = buildOrderPayload('LimitExceeded', SYMBOLS, ACCOUNT);
      expect(p.quantity).toBeGreaterThanOrEqual(1001);
    }
  });

  it('Given DuplicateKeys scenario with shared key, Should use that key for every order', () => {
    const sharedKey = makeDuplicateKey();
    const payloads = Array.from({ length: 5 }, () =>
      buildOrderPayload('DuplicateKeys', SYMBOLS, ACCOUNT, sharedKey),
    );
    const keys = new Set(payloads.map((p) => p.idempotencyKey));
    expect(keys.size).toBe(1);
    expect(keys.has(sharedKey)).toBe(true);
  });

  it('Given InvalidPayload scenario, Should omit the quantity field', () => {
    const p = buildOrderPayload('InvalidPayload', SYMBOLS, ACCOUNT);
    expect(p.quantity).toBeUndefined();
  });

  it('Given Normal scenario without shared key, Should generate unique keys', () => {
    const keys = new Set(
      Array.from({ length: 10 }, () => buildOrderPayload('Normal', SYMBOLS, ACCOUNT).idempotencyKey),
    );
    expect(keys.size).toBe(10);
  });
});

describe('makeDuplicateKey', () => {
  it('Should return a UUID string', () => {
    const key = makeDuplicateKey();
    expect(typeof key).toBe('string');
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
