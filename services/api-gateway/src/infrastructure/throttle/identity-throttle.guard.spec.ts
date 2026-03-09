import { IdentityThrottleGuard } from './identity-throttle.guard';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '../auth/jwt.strategy';

type GuardWithTracker = { getTracker(req: FastifyRequest): Promise<string> };

// Instantiate without the ThrottlerGuard constructor (only testing getTracker logic)
const makeGuard = (): GuardWithTracker =>
  Object.create(IdentityThrottleGuard.prototype) as GuardWithTracker;

describe('IdentityThrottleGuard.getTracker', () => {
  it('returns user.sub for authenticated requests', async () => {
    const req = {
      user: { sub: 'trader' } as JwtPayload,
      ip: '1.2.3.4',
    } as unknown as FastifyRequest;
    expect(await makeGuard().getTracker(req)).toBe('trader');
  });

  it('falls back to IP when no user', async () => {
    const req = { ip: '1.2.3.4' } as unknown as FastifyRequest;
    expect(await makeGuard().getTracker(req)).toBe('1.2.3.4');
  });
});
