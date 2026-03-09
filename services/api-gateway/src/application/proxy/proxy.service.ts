import {
  Injectable,
  BadGatewayException,
  HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import type { FastifyRequest } from 'fastify';

const UPSTREAM_TIMEOUT_MS = 10_000;

@Injectable()
export class ProxyService {
  constructor(private readonly http: HttpService) {}

  async forward<T>(
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
        // Sanitise: only forward safe fields — never raw upstream internals
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
    // Forward only statusCode + message — strip stack traces, internal paths, etc.
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
