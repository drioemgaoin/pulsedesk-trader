import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { of, Subject, Observable } from 'rxjs';
import { LoadSheddingInterceptor } from './load-shedding.interceptor';

function makeContext(method: string, url = '/api/v1/orders'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => ({ header: jest.fn() }),
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(result: unknown = { ok: true }) {
  return { handle: () => of(result) };
}

describe('LoadSheddingInterceptor', () => {
  let interceptor: LoadSheddingInterceptor;

  beforeEach(() => {
    delete process.env['GATEWAY_LOAD_SHED_THRESHOLD'];
    interceptor = new LoadSheddingInterceptor();
  });

  describe('when in-flight count is below threshold', () => {
    it('should pass GET requests through', (done) => {
      interceptor
        .intercept(makeContext('GET'), makeHandler())
        .subscribe({ next: (v) => { expect(v).toEqual({ ok: true }); done(); } });
    });

    it('should always pass POST requests through regardless of count', (done) => {
      interceptor
        .intercept(makeContext('POST'), makeHandler())
        .subscribe({ next: (v) => { expect(v).toEqual({ ok: true }); done(); } });
    });
  });

  describe('when in-flight count is at or above threshold', () => {
    beforeEach(() => {
      process.env['GATEWAY_LOAD_SHED_THRESHOLD'] = '2';
      interceptor = new LoadSheddingInterceptor();
    });

    it('should reject GET requests with ServiceUnavailableException', (done) => {
      // Fill two in-flight slots (they hang — never emit)
      const hang = { handle: () => new Subject() };
      interceptor.intercept(makeContext('GET'), hang).subscribe();
      interceptor.intercept(makeContext('GET'), hang).subscribe();

      // Third GET should be shed
      try {
        interceptor.intercept(makeContext('GET'), makeHandler());
        done.fail('Expected ServiceUnavailableException');
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        done();
      }
    });

    it('should not shed POST requests even when threshold is exceeded', (done) => {
      const hang = { handle: () => new Subject() };
      interceptor.intercept(makeContext('GET'), hang).subscribe();
      interceptor.intercept(makeContext('GET'), hang).subscribe();

      // POST should still pass
      interceptor
        .intercept(makeContext('POST'), makeHandler())
        .subscribe({ next: (v) => { expect(v).toEqual({ ok: true }); done(); } });
    });
  });

  describe('in-flight counter lifecycle', () => {
    it('should be 1 during request execution and 0 after completion', (done) => {
      let countDuringExecution = -1;
      const capturingHandler = {
        handle: () =>
          new Observable((sub) => {
            countDuringExecution = interceptor.getInFlight();
            sub.next({ ok: true });
            sub.complete();
          }),
      };
      interceptor.intercept(makeContext('GET'), capturingHandler).subscribe({
        complete: () => {
          expect(countDuringExecution).toBe(1);
          expect(interceptor.getInFlight()).toBe(0);
          done();
        },
      });
    });

    it('should decrement on error', (done) => {
      const errorHandler = {
        handle: () => new Observable((s) => { s.error(new Error('upstream fail')); }),
      };
      interceptor.intercept(makeContext('GET'), errorHandler).subscribe({
        error: () => {
          expect(interceptor.getInFlight()).toBe(0);
          done();
        },
      });
    });
  });
});
