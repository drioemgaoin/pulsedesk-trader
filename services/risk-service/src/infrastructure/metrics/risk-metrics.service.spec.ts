import { RiskMetricsService } from './risk-metrics.service';

describe('Given the RiskMetricsService is initialised', () => {
  describe('when recordEvaluation is called with an APPROVED outcome', () => {
    it('should increment the risk_evaluation_total counter for APPROVED', async () => {
      const svc = new RiskMetricsService();
      svc.recordEvaluation('APPROVED', 3);
      const text = await svc.getMetrics();
      expect(text).toMatch(/risk_evaluation_total\{outcome="APPROVED"\} 1/);
    });

    it('should observe the latency in the risk_evaluation_latency_ms histogram', async () => {
      const svc = new RiskMetricsService();
      svc.recordEvaluation('APPROVED', 5);
      const text = await svc.getMetrics();
      expect(text).toMatch(/risk_evaluation_latency_ms/);
    });
  });

  describe('when recordEvaluation is called with a REJECTED outcome', () => {
    it('should increment the risk_evaluation_total counter for REJECTED', async () => {
      const svc = new RiskMetricsService();
      svc.recordEvaluation('REJECTED', 2);
      const text = await svc.getMetrics();
      expect(text).toMatch(/risk_evaluation_total\{outcome="REJECTED"\} 1/);
    });
  });

  describe('when multiple evaluations are recorded', () => {
    it('should accumulate counts per outcome independently', async () => {
      const svc = new RiskMetricsService();
      svc.recordEvaluation('APPROVED', 1);
      svc.recordEvaluation('APPROVED', 2);
      svc.recordEvaluation('REJECTED', 1);
      const text = await svc.getMetrics();
      expect(text).toMatch(/risk_evaluation_total\{outcome="APPROVED"\} 2/);
      expect(text).toMatch(/risk_evaluation_total\{outcome="REJECTED"\} 1/);
    });
  });
});
