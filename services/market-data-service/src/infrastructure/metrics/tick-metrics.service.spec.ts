import { TickMetricsService } from './tick-metrics.service';

describe('TickMetricsService', () => {
  it('starts at zero', () => {
    const svc = new TickMetricsService();
    expect(svc.emitted).toBe(0);
    expect(svc.rejected).toBe(0);
  });

  it('increments counters', () => {
    const svc = new TickMetricsService();
    svc.incrementEmitted();
    svc.incrementEmitted();
    svc.incrementRejected();
    expect(svc.emitted).toBe(2);
    expect(svc.rejected).toBe(1);
  });

  it('toPrometheusText contains expected metric names', () => {
    const svc = new TickMetricsService();
    svc.incrementEmitted();
    const text = svc.toPrometheusText();
    expect(text).toContain('market_tick_emitted_total 1');
    expect(text).toContain('market_tick_rejected_total 0');
    expect(text).toContain('market_tick_rate_per_second');
  });

  it('ticksPerSecond returns 0 when no time has elapsed', () => {
    const fixed = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(fixed); // freeze time: startMs = fixed, now() = fixed → elapsed = 0
    const svc = new TickMetricsService();
    svc.incrementEmitted();
    expect(svc.ticksPerSecond).toBe(0);
    jest.restoreAllMocks();
  });
});
