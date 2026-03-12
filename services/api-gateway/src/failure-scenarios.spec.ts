/**
 * T4 — Failure scenario validation
 *
 * AC:
 *   1. Simulated dependency outages show graceful degradation
 *   2. Recovery behavior after dependency restoration is validated
 *   3. No crash-loop behavior under tested failure modes
 *
 * Approach: scenario-level tests exercising the real resilience stack
 * (CircuitBreakerRegistry + LoadSheddingInterceptor + ProxyService) with
 * mocked upstreams. Each describe block maps to one failure mode.
 */

import { BadGatewayException, ExecutionContext, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { of, throwError, Subject } from 'rxjs';
import { TimeoutError } from 'rxjs';
import { CircuitBreakerRegistry } from './infrastructure/resilience/circuit-breaker.registry';
import { LoadSheddingInterceptor } from './infrastructure/resilience/load-shedding.interceptor';
import { ProxyService } from './application/proxy/proxy.service';

// ── helpers ────────────────────────────────────────────────────────────────

/** Fires `n` failing calls through a registry to push breaker past volumeThreshold. */
async function exhaustBreaker(registry: CircuitBreakerRegistry, origin: string, n = 6): Promise<void> {
  for (let i = 0; i < n; i++) {
    await registry
      .fire(`${origin}/path`, () => Promise.reject(new Error('upstream down')))
      .catch(() => {/* expected */});
  }
}

/** ProxyService request — plain object with method/url/headers. */
function makeRequest(method: string, url = '/api/v1/orders') {
  return { method, url, headers: {} } as never;
}

/** NestJS ExecutionContext for LoadSheddingInterceptor. */
function makeContext(method: string, url = '/api/v1/orders'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => ({ header: jest.fn() }),
    }),
  } as unknown as ExecutionContext;
}

function makeCallHandler(result: unknown = { ok: true }) {
  return { handle: () => of(result) };
}


// ── Scenario 1: Upstream complete outage — graceful degradation ────────────

describe('Scenario: upstream complete outage → graceful 503, no crash', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    process.env['ORDER_SERVICE_URL'] = 'http://order-svc:3012';
    process.env['PORTFOLIO_SERVICE_URL'] = 'http://portfolio-svc:3015';
    registry = new CircuitBreakerRegistry();
  });

  it('should return upstream error (not crash) while circuit is still closed', async () => {
    const err = new Error('connection refused');
    await expect(
      registry.fire('http://order-svc:3012/v1/orders', () => Promise.reject(err)),
    ).rejects.toThrow('connection refused');
  });

  it('should throw ServiceUnavailableException once circuit opens (not crash)', async () => {
    await exhaustBreaker(registry, 'http://order-svc:3012');

    await expect(
      registry.fire('http://order-svc:3012/v1/orders', () => Promise.resolve({ ok: true })),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('should not call the upstream fn when circuit is open', async () => {
    await exhaustBreaker(registry, 'http://order-svc:3012');

    const upstream = jest.fn().mockResolvedValue({ ok: true });
    await registry
      .fire('http://order-svc:3012/v1/orders', upstream)
      .catch(() => {/* expected ServiceUnavailableException */});

    expect(upstream).not.toHaveBeenCalled();
  });

  it('circuit opens independently per upstream — portfolio unaffected by order outage', async () => {
    await exhaustBreaker(registry, 'http://order-svc:3012');

    // portfolio circuit is still closed — should succeed
    const result = await registry.fire(
      'http://portfolio-svc:3015/v1/positions',
      () => Promise.resolve({ positions: [] }),
    );
    expect(result).toEqual({ positions: [] });
  });
});

// ── Scenario 2: Recovery after dependency restoration ─────────────────────

describe('Scenario: upstream recovers → circuit transitions to half-open then closed', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env['ORDER_SERVICE_URL'] = 'http://order-svc:3012';
    process.env['PORTFOLIO_SERVICE_URL'] = 'http://portfolio-svc:3015';
    registry = new CircuitBreakerRegistry();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should transition to HALF-OPEN after resetTimeout and allow probe request', async () => {
    // Open the circuit
    await exhaustBreaker(registry, 'http://order-svc:3012');
    const states = registry.getStates();
    expect(states['http://order-svc:3012']).toBe('open');

    // Advance past resetTimeout (15 000 ms)
    jest.advanceTimersByTime(16_000);

    // After reset, circuit should be half-open — probe request goes through
    const probe = jest.fn().mockResolvedValue({ ok: true });
    const result = await registry.fire('http://order-svc:3012/v1/orders', probe);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it('should return to CLOSED after a successful probe', async () => {
    await exhaustBreaker(registry, 'http://order-svc:3012');
    jest.advanceTimersByTime(16_000);

    // Successful probe closes the circuit
    await registry.fire('http://order-svc:3012/v1/orders', () => Promise.resolve({ ok: true }));

    expect(registry.getStates()['http://order-svc:3012']).toBe('closed');
  });

  it('should re-open if the probe fails after half-open', async () => {
    await exhaustBreaker(registry, 'http://order-svc:3012');
    jest.advanceTimersByTime(16_000);

    // Failed probe re-opens the circuit
    await registry
      .fire('http://order-svc:3012/v1/orders', () => Promise.reject(new Error('still down')))
      .catch(() => {});

    expect(registry.getStates()['http://order-svc:3012']).toBe('open');
  });
});

// ── Scenario 3: Transient failure — retry delivers eventual success ─────────

describe('Scenario: transient upstream failure → retry recovers, no crash', () => {
  function makeHttp(responses: Array<'ok' | 'error' | 'timeout'>) {
    let call = 0;
    return {
      request: jest.fn().mockImplementation(() => {
        const r = responses[call++] ?? 'ok';
        if (r === 'error') return throwError(() => ({ response: { status: 500, data: { message: 'Internal Server Error' } } }));
        if (r === 'timeout') return throwError(() => new TimeoutError());
        return of({ data: { ok: true } });
      }),
    };
  }

  function makePassthroughRegistry(): CircuitBreakerRegistry {
    return {
      fire: <T>(_url: string, fn: () => Promise<T>) => fn(),
    } as unknown as CircuitBreakerRegistry;
  }

  it('should succeed on second attempt after one transient 5xx', async () => {
    const http = makeHttp(['error', 'ok']);
    const service = new ProxyService(http as never, makePassthroughRegistry());

    const result = await service.forward(makeRequest('GET'), 'http://svc/path', 'GET');

    expect(result).toEqual({ ok: true });
    expect(http.request).toHaveBeenCalledTimes(2);
  });

  it('should exhaust retries and throw BadGatewayException after 3 total attempts', async () => {
    const http = makeHttp(['error', 'error', 'error']);
    const service = new ProxyService(http as never, makePassthroughRegistry());

    await expect(
      service.forward(makeRequest('GET'), 'http://svc/path', 'GET'),
    ).rejects.toThrow(HttpException);

    expect(http.request).toHaveBeenCalledTimes(3); // 1 attempt + 2 retries
  });

  it('should not retry POST requests (non-idempotent)', async () => {
    const http = makeHttp(['error', 'ok']);
    const service = new ProxyService(http as never, makePassthroughRegistry());

    await expect(
      service.forward(makeRequest('POST'), 'http://svc/path', 'POST', { qty: 100 }),
    ).rejects.toThrow(HttpException);

    expect(http.request).toHaveBeenCalledTimes(1); // no retry
  });

  it('should not retry on 404 (non-retryable 4xx)', async () => {
    const http = {
      request: jest.fn().mockReturnValue(
        throwError(() => ({ response: { status: 404, data: { message: 'Not Found' } } })),
      ),
    };
    const service = new ProxyService(http as never, makePassthroughRegistry());

    await expect(
      service.forward(makeRequest('GET'), 'http://svc/path', 'GET'),
    ).rejects.toThrow(HttpException);

    expect(http.request).toHaveBeenCalledTimes(1);
  });

  it('should not retry when circuit is open (open-circuit aborts retry loop)', async () => {
    const openCircuitError = Object.assign(new Error('Breaker is open'), {
      constructor: { name: 'OpenCircuitError' },
    });
    const http = { request: jest.fn().mockReturnValue(throwError(() => openCircuitError)) };

    // Registry that throws ServiceUnavailableException (open circuit)
    const registry = {
      fire: jest.fn().mockRejectedValue(new ServiceUnavailableException('circuit open or at capacity')),
    } as unknown as CircuitBreakerRegistry;

    const service = new ProxyService(http as never, registry);

    await expect(
      service.forward(makeRequest('GET'), 'http://svc/path', 'GET'),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(registry.fire).toHaveBeenCalledTimes(1); // no retry on open circuit
  });
});

// ── Scenario 4: Gateway saturation — load shedding, no crash ───────────────

describe('Scenario: gateway saturation → GET shed with 503, POST always passes', () => {
  let interceptor: LoadSheddingInterceptor;

  beforeEach(() => {
    process.env['GATEWAY_LOAD_SHED_THRESHOLD'] = '2';
    interceptor = new LoadSheddingInterceptor();
  });

  afterEach(() => {
    delete process.env['GATEWAY_LOAD_SHED_THRESHOLD'];
  });

  it('should reject excess GET requests with ServiceUnavailableException, not crash', () => {
    const hang = { handle: () => new Subject() };
    interceptor.intercept(makeContext('GET'), hang).subscribe();
    interceptor.intercept(makeContext('GET'), hang).subscribe();

    expect(() =>
      interceptor.intercept(makeContext('GET'), makeCallHandler()),
    ).toThrow(ServiceUnavailableException);
  });

  it('should set Retry-After header before throwing on shed', () => {
    const replyMock = { header: jest.fn() };
    const ctx: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/test' }),
        getResponse: () => replyMock,
      }),
    } as unknown as ExecutionContext;

    const hang = { handle: () => new Subject() };
    interceptor.intercept(ctx, hang).subscribe();
    interceptor.intercept(ctx, hang).subscribe();

    try {
      interceptor.intercept(ctx, makeCallHandler());
    } catch {
      expect(replyMock.header).toHaveBeenCalledWith('Retry-After', '2');
    }
  });

  it('should pass POST through even when threshold is exceeded (graceful degradation)', (done) => {
    const hang = { handle: () => new Subject() };
    interceptor.intercept(makeContext('GET'), hang).subscribe();
    interceptor.intercept(makeContext('GET'), hang).subscribe();

    interceptor
      .intercept(makeContext('POST'), makeCallHandler({ order: 'accepted' }))
      .subscribe({
        next: (v) => {
          expect(v).toEqual({ order: 'accepted' });
          done();
        },
      });
  });

  it('in-flight counter returns to 0 after completion — no counter leak', (done) => {
    interceptor
      .intercept(makeContext('GET'), makeCallHandler())
      .subscribe({
        complete: () => {
          expect(interceptor.getInFlight()).toBe(0);
          done();
        },
      });
  });

  it('in-flight counter returns to 0 on upstream error — no counter leak', (done) => {
    const errSubject = new Subject<never>();
    const errHandler = { handle: () => errSubject.asObservable() };
    interceptor.intercept(makeContext('GET'), errHandler).subscribe({
      error: () => {
        expect(interceptor.getInFlight()).toBe(0);
        done();
      },
    });
    errSubject.error(new Error('upstream crash'));
  });
});

// ── Scenario 5: No crash-loop — all error paths produce HTTP exceptions ────

describe('Scenario: no crash-loop — all failure modes produce caught HTTP exceptions', () => {
  function makePassthroughRegistry(): CircuitBreakerRegistry {
    return { fire: <T>(_u: string, fn: () => Promise<T>) => fn() } as unknown as CircuitBreakerRegistry;
  }

  it('upstream timeout → BadGatewayException (not unhandled rejection)', async () => {
    const http = { request: jest.fn().mockReturnValue(throwError(() => new TimeoutError())) };
    const service = new ProxyService(http as never, makePassthroughRegistry());

    const err = await service
      .forward(makeRequest('GET'), 'http://svc/path', 'GET')
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(BadGatewayException);
  });

  it('upstream unknown error → BadGatewayException (not unhandled rejection)', async () => {
    const http = { request: jest.fn().mockReturnValue(throwError(() => new Error('ECONNRESET'))) };
    const service = new ProxyService(http as never, makePassthroughRegistry());

    const err = await service
      .forward(makeRequest('GET'), 'http://svc/path', 'GET')
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(BadGatewayException);
  });

  it('upstream 5xx with body → HttpException preserving status code (not unhandled rejection)', async () => {
    const http = {
      request: jest.fn().mockReturnValue(
        throwError(() => ({ response: { status: 503, data: { message: 'downstream overloaded' } } })),
      ),
    };
    const service = new ProxyService(http as never, makePassthroughRegistry());

    const err = await service
      .forward(makeRequest('POST'), 'http://svc/path', 'POST', {})
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(503);
  });

  it('circuit open → ServiceUnavailableException (not unhandled rejection)', async () => {
    const registry = {
      fire: jest.fn().mockRejectedValue(
        new ServiceUnavailableException('Upstream circuit open or at capacity'),
      ),
    } as unknown as CircuitBreakerRegistry;
    const http = { request: jest.fn() };
    const service = new ProxyService(http as never, registry);

    const err = await service
      .forward(makeRequest('GET'), 'http://svc/path', 'GET')
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ServiceUnavailableException);
  });

  it('load shed → ServiceUnavailableException thrown synchronously (not unhandled rejection)', () => {
    process.env['GATEWAY_LOAD_SHED_THRESHOLD'] = '0';
    const interceptor = new LoadSheddingInterceptor();

    let caught: unknown;
    try {
      interceptor.intercept(makeContext('GET'), makeCallHandler());
    } catch (e) {
      caught = e;
    } finally {
      delete process.env['GATEWAY_LOAD_SHED_THRESHOLD'];
    }

    expect(caught).toBeInstanceOf(ServiceUnavailableException);
  });
});
