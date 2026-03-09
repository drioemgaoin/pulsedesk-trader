import { MetricsController } from './metrics.controller';
import { TickMetricsService } from '../../infrastructure/metrics/tick-metrics.service';

describe('MetricsController', () => {
  it('returns prometheus text from TickMetricsService', () => {
    const svc = new TickMetricsService();
    svc.incrementEmitted();
    const ctrl = new MetricsController(svc);
    const text = ctrl.metrics();
    expect(text).toContain('market_tick_emitted_total 1');
    expect(text).toContain('market_tick_rejected_total 0');
  });
});
