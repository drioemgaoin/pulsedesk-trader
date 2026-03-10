import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly apiKey = process.env['INTERNAL_ORDER_API_KEY'];

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKey) return true;
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    if (req.headers['x-api-key'] !== this.apiKey) {
      throw new UnauthorizedException('Missing or invalid API key');
    }
    return true;
  }
}
