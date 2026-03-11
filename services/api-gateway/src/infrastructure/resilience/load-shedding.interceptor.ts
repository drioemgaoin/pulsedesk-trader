import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { Observable, tap } from 'rxjs';

const DEFAULT_THRESHOLD = 500;

/**
 * Global load-shedding interceptor for the API Gateway.
 *
 * Tracks the number of in-flight requests across the gateway process.
 * When the count exceeds the threshold, non-critical GET endpoints are
 * rejected immediately with 503 + Retry-After header, preventing the
 * gateway from becoming overwhelmed under burst load.
 *
 * POST /api/v1/orders is never shed — it is the critical write path.
 */
@Injectable()
export class LoadSheddingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoadSheddingInterceptor.name);
  private readonly threshold: number;
  private inFlight = 0;

  constructor() {
    this.threshold = parseInt(
      process.env['GATEWAY_LOAD_SHED_THRESHOLD'] ?? String(DEFAULT_THRESHOLD),
      10,
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();

    // Critical write path — never shed
    if (req.method === 'POST') {
      return next.handle();
    }

    if (this.inFlight >= this.threshold) {
      this.logger.warn(
        { inFlight: this.inFlight, threshold: this.threshold, path: req.url },
        'load shed — rejecting non-critical request',
      );
      const reply = context.switchToHttp().getResponse<FastifyReply>();
      void reply.header('Retry-After', '2');
      throw new ServiceUnavailableException('Service temporarily overloaded — retry shortly');
    }

    this.inFlight++;
    return next.handle().pipe(
      tap({ complete: () => { this.inFlight--; }, error: () => { this.inFlight--; } }),
    );
  }

  /** Exposed for testing. */
  getInFlight(): number {
    return this.inFlight;
  }
}
