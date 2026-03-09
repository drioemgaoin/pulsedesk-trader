import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '../auth/jwt.strategy';

@Injectable()
export class IdentityThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: FastifyRequest): Promise<string> {
    const user = (req as FastifyRequest & { user?: JwtPayload }).user;
    return user?.sub ?? (req.ip as string);
  }
}
