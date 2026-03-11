import { MetricsController } from './metrics.controller';
import type { MarketStreamGateway } from '../ws/market-stream.gateway';

const makeGateway = (overrides = {}) =>
  ({
    getMetrics: jest.fn().mockReturnValue({
      activeConnections: 3,
      messagesSent: 1000,
      droppedMessages: 5,
      ...overrides,
    }),
  }) as unknown as MarketStreamGateway;

describe('Given a MetricsController instance', () => {
  describe('when metrics() is called', () => {
    it('should include ws_active_connections gauge with current value', () => {
      const ctrl = new MetricsController(makeGateway());
      expect(ctrl.metrics()).toContain('ws_active_connections 3');
    });

    it('should include ws_messages_sent_total counter with current value', () => {
      const ctrl = new MetricsController(makeGateway());
      expect(ctrl.metrics()).toContain('ws_messages_sent_total 1000');
    });

    it('should include ws_messages_dropped_total counter with current value', () => {
      const ctrl = new MetricsController(makeGateway());
      expect(ctrl.metrics()).toContain('ws_messages_dropped_total 5');
    });

    it('should include HELP and TYPE lines for each metric', () => {
      const ctrl = new MetricsController(makeGateway());
      const output = ctrl.metrics();
      expect(output).toContain('# TYPE ws_active_connections gauge');
      expect(output).toContain('# TYPE ws_messages_sent_total counter');
      expect(output).toContain('# TYPE ws_messages_dropped_total counter');
    });
  });
});
