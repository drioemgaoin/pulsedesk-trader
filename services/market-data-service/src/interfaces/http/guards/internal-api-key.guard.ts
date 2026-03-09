import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

/**
 * Guards the tick ingestion endpoint with an optional API key.
 *
 * When INTERNAL_TICK_API_KEY is set, the caller must supply a matching
 * `x-api-key` header. When the env var is absent (local dev / test) the
 * guard is a no-op, keeping the endpoint open for convenience.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly apiKey = process.env['INTERNAL_TICK_API_KEY'];

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKey) return true;
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    if (req.headers['x-api-key'] !== this.apiKey) {
      throw new UnauthorizedException('Missing or invalid API key');
    }
    return true;
  }
}
