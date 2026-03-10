import { TickMetricsService } from './tick-metrics.service';

describe('Given a TickMetricsService instance', () => {
  describe('when no events have been recorded', () => {
    it('should start with all counters at zero', () => {
      const svc = new TickMetricsService();
      expect(svc.emitted).toBe(0);
      expect(svc.rejected).toBe(0);
      expect(svc.publishFailed).toBe(0);
    });
  });

  describe('when increment methods are called', () => {
    it('should increment the respective counters independently', () => {
      const svc = new TickMetricsService();
      svc.incrementEmitted();
      svc.incrementEmitted();
      svc.incrementRejected();
      svc.incrementPublishFailed();
      expect(svc.emitted).toBe(2);
      expect(svc.rejected).toBe(1);
      expect(svc.publishFailed).toBe(1);
    });
  });

  describe('when toPrometheusText is called after recording events', () => {
    it('should include all expected metric names with their values', () => {
      const svc = new TickMetricsService();
      svc.incrementEmitted();
      svc.incrementPublishFailed();
      const text = svc.toPrometheusText();
      expect(text).toContain('market_tick_emitted_total 1');
      expect(text).toContain('market_tick_rejected_total 0');
      expect(text).toContain('market_tick_rate_per_second');
      expect(text).toContain('market_tick_publish_failed_total 1');
    });
  });

  describe('when no time has elapsed since construction', () => {
    it('should return 0 for ticksPerSecond', () => {
      const fixed = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(fixed); // freeze time: startMs = fixed, now() = fixed → elapsed = 0
      const svc = new TickMetricsService();
      svc.incrementEmitted();
      expect(svc.ticksPerSecond).toBe(0);
      jest.restoreAllMocks();
    });
  });
});
