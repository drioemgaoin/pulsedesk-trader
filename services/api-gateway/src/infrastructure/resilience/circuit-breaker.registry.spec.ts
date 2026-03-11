import { ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreakerRegistry } from './circuit-breaker.registry';

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    process.env['ORDER_SERVICE_URL'] = 'http://order-svc:3012';
    process.env['PORTFOLIO_SERVICE_URL'] = 'http://portfolio-svc:3015';
    registry = new CircuitBreakerRegistry();
  });

  describe('when the upstream call succeeds', () => {
    it('should return the resolved value', async () => {
      const result = await registry.fire('http://order-svc:3012/v1/orders', () =>
        Promise.resolve({ id: '1' }),
      );
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('when the upstream call fails', () => {
    it('should propagate the error', async () => {
      await expect(
        registry.fire('http://order-svc:3012/v1/orders', () =>
          Promise.reject(new Error('connection refused')),
        ),
      ).rejects.toThrow('connection refused');
    });
  });

  describe('when the circuit opens after repeated failures', () => {
    it('should throw ServiceUnavailableException once the breaker opens', async () => {
      // Drive failures past volumeThreshold (5) to open the circuit
      const fail = () =>
        registry.fire('http://order-svc:3012/v1/orders', () =>
          Promise.reject(new Error('upstream down')),
        );

      for (let i = 0; i < 5; i++) {
        await expect(fail()).rejects.toThrow();
      }

      // Circuit should now be open — next call is rejected immediately
      await expect(fail()).rejects.toThrow(ServiceUnavailableException);
    }, 15_000);
  });

  describe('getStates', () => {
    it('should return an empty object before any calls', () => {
      const states = registry.getStates();
      expect(typeof states).toBe('object');
    });

    it('should include circuit state after first call', async () => {
      await registry.fire('http://order-svc:3012/v1/orders', () => Promise.resolve('ok'));
      const states = registry.getStates();
      expect(Object.keys(states)).toContain('http://order-svc:3012');
      expect(states['http://order-svc:3012']).toBe('closed');
    });
  });
});
