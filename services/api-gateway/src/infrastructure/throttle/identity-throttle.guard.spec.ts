import { IdentityThrottleGuard } from './identity-throttle.guard';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '../auth/jwt.strategy';

type GuardWithTracker = { getTracker(req: FastifyRequest): Promise<string> };

// Instantiate without the ThrottlerGuard constructor (only testing getTracker logic)
const makeGuard = (): GuardWithTracker =>
  Object.create(IdentityThrottleGuard.prototype) as GuardWithTracker;

describe('Given an IdentityThrottleGuard instance', () => {
  describe('when the request has an authenticated user', () => {
    it('should return the user sub as tracker key', async () => {
      const req = {
        user: { sub: 'trader' } as JwtPayload,
        ip: '1.2.3.4',
      } as unknown as FastifyRequest;
      expect(await makeGuard().getTracker(req)).toBe('trader');
    });
  });

  describe('when the request has no authenticated user', () => {
    it('should fall back to the client IP as tracker key', async () => {
      const req = { ip: '1.2.3.4' } as unknown as FastifyRequest;
      expect(await makeGuard().getTracker(req)).toBe('1.2.3.4');
    });
  });
});
