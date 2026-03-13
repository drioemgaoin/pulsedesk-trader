import { describe, it, expect } from 'vitest';
import { burstDelays, steadyDelays, rampDelays, totalOrderCount, buildDelays } from './generators';

describe('burstDelays', () => {
  it('Given count=5, Should return 5 zero delays', () => {
    const delays = burstDelays({ profile: 'Burst', count: 5 });
    expect(delays).toHaveLength(5);
    expect(delays.every((d) => d === 0)).toBe(true);
  });

  it('Given count=500 (max), Should return exactly 500 entries', () => {
    const delays = burstDelays({ profile: 'Burst', count: 500 });
    expect(delays).toHaveLength(500);
  });
});

describe('steadyDelays', () => {
  it('Given rate=5 duration=10, Should return 50 delays of 200ms each', () => {
    const delays = steadyDelays({ profile: 'Steady', ratePerSecond: 5, durationSeconds: 10 });
    expect(delays).toHaveLength(50);
    expect(delays[0]).toBeCloseTo(200);
  });

  it('Given rate=1 duration=60, Should return 60 delays of 1000ms each', () => {
    const delays = steadyDelays({ profile: 'Steady', ratePerSecond: 1, durationSeconds: 60 });
    expect(delays).toHaveLength(60);
    expect(delays[0]).toBe(1000);
  });
});

describe('rampDelays', () => {
  it('Given min=1 max=10 duration=10, Should return more than minRate*duration orders', () => {
    const delays = rampDelays({ profile: 'Ramp', minRatePerSecond: 1, maxRatePerSecond: 10, durationSeconds: 10 });
    // Average rate ≈ 5.5 orders/sec × 10s = 55 orders
    expect(delays.length).toBeGreaterThan(10);
    expect(delays.length).toBeLessThan(110);
  });

  it('Given min=5 max=5 duration=5, Should keep constant rate', () => {
    const delays = rampDelays({ profile: 'Ramp', minRatePerSecond: 5, maxRatePerSecond: 5, durationSeconds: 5 });
    // 5 orders/sec × 5 sec = 25
    expect(delays).toHaveLength(25);
  });

  it('Given duration=1, Should produce at least minRate orders', () => {
    const delays = rampDelays({ profile: 'Ramp', minRatePerSecond: 3, maxRatePerSecond: 10, durationSeconds: 1 });
    expect(delays.length).toBeGreaterThanOrEqual(1);
  });
});

describe('totalOrderCount', () => {
  it('Given Burst profile, Should return count exactly', () => {
    expect(totalOrderCount({ profile: 'Burst', count: 42 })).toBe(42);
  });

  it('Given Steady profile, Should return rate×duration', () => {
    expect(totalOrderCount({ profile: 'Steady', ratePerSecond: 5, durationSeconds: 10 })).toBe(50);
  });

  it('Given Ramp profile, Should return average rate × duration', () => {
    // avg = (2+8)/2 = 5, total = 5×10 = 50
    expect(totalOrderCount({ profile: 'Ramp', minRatePerSecond: 2, maxRatePerSecond: 8, durationSeconds: 10 })).toBe(50);
  });
});

describe('buildDelays', () => {
  it('Given Burst, Should delegate to burstDelays', () => {
    const d = buildDelays({ profile: 'Burst', count: 3 });
    expect(d).toHaveLength(3);
  });

  it('Given Steady, Should delegate to steadyDelays', () => {
    const d = buildDelays({ profile: 'Steady', ratePerSecond: 2, durationSeconds: 5 });
    expect(d).toHaveLength(10);
  });
});
