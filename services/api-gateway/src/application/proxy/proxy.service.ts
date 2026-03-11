import {
  Injectable,
  BadGatewayException,
  HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import type { FastifyRequest } from 'fastify';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import pRetry = require('p-retry');
import { CircuitBreakerRegistry } from '../../infrastructure/resilience/circuit-breaker.registry';

const UPSTREAM_TIMEOUT_MS = 10_000;

const RETRY_OPTIONS: pRetry.Options = {
  retries: 2,
  minTimeout: 200,
  factor: 2,
  randomize: true, // full jitter — prevents thundering herd on recovery
  onFailedAttempt: (err: pRetry.FailedAttemptError) => {
    // Stop retrying on: open circuit, 4xx responses (except 408 Request Timeout, 429 Too Many Requests).
    // Rethrowing err directly causes p-retry to reject with the original error (not wrapped in AbortError).
    if (isOpenCircuit(err) || isNonRetryable4xx(err)) {
      throw err;
    }
  },
};

@Injectable()
export class ProxyService {
  constructor(
    private readonly http: HttpService,
    private readonly breakers: CircuitBreakerRegistry,
  ) {}

  async forward<T>(
    req: FastifyRequest,
    url: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    const execute = () => this.breakers.fire(url, () => this.call<T>(req, url, method, body));

    if (method === 'GET') {
      return pRetry(execute, RETRY_OPTIONS);
    }
    return execute();
  }

  private async call<T>(
    req: FastifyRequest,
    url: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (req.headers['x-request-id']) {
      headers['x-request-id'] = req.headers['x-request-id'] as string;
    }
    if (req.headers['traceparent']) {
      headers['traceparent'] = req.headers['traceparent'] as string;
    }

    try {
      const response = await firstValueFrom(
        this.http
          .request<T>({ method, url, data: body, headers })
          .pipe(timeout(UPSTREAM_TIMEOUT_MS)),
      );
      return response.data;
    } catch (err: unknown) {
      if (err instanceof TimeoutError) {
        throw new BadGatewayException('Upstream timeout');
      }
      if (
        err instanceof Object &&
        'response' in err &&
        err.response instanceof Object &&
        'status' in err.response &&
        'data' in err.response
      ) {
        const upstream = err.response as { status: number; data: unknown };
        const safe = this.sanitiseUpstreamError(upstream.data, upstream.status);
        throw new HttpException(safe, upstream.status);
      }
      throw new BadGatewayException('Upstream error');
    }
  }

  private sanitiseUpstreamError(
    data: unknown,
    status: number,
  ): { statusCode: number; message: string } {
    if (
      data instanceof Object &&
      'message' in data &&
      typeof (data as Record<string, unknown>)['message'] === 'string'
    ) {
      return {
        statusCode: status,
        message: (data as Record<string, unknown>)['message'] as string,
      };
    }
    return { statusCode: status, message: 'Upstream request failed' };
  }
}

function isOpenCircuit(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.constructor.name === 'OpenCircuitError' ||
      err.message.includes('open circuit') ||
      err.message.includes('Breaker is open') ||
      err.message.includes('circuit open or at capacity'))
  );
}

function isNonRetryable4xx(err: unknown): boolean {
  if (!(err instanceof HttpException)) return false;
  const status = err.getStatus();
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}
