import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { InternalApiKeyGuard } from './internal-api-key.guard';

const makeCtx = (headers: Record<string, string> = {}): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('Given an InternalApiKeyGuard instance', () => {
  const ORIGINAL = process.env['INTERNAL_TICK_API_KEY'];

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env['INTERNAL_TICK_API_KEY'];
    } else {
      process.env['INTERNAL_TICK_API_KEY'] = ORIGINAL;
    }
  });

  describe('when INTERNAL_TICK_API_KEY is not configured', () => {
    it('should allow all requests through', () => {
      delete process.env['INTERNAL_TICK_API_KEY'];
      const guard = new InternalApiKeyGuard();
      expect(guard.canActivate(makeCtx())).toBe(true);
    });
  });

  describe('when INTERNAL_TICK_API_KEY is configured and the request has the matching key', () => {
    it('should allow the request through', () => {
      process.env['INTERNAL_TICK_API_KEY'] = 'secret';
      const guard = new InternalApiKeyGuard();
      expect(guard.canActivate(makeCtx({ 'x-api-key': 'secret' }))).toBe(true);
    });
  });

  describe('when INTERNAL_TICK_API_KEY is configured and the request has no key', () => {
    it('should throw UnauthorizedException', () => {
      process.env['INTERNAL_TICK_API_KEY'] = 'secret';
      const guard = new InternalApiKeyGuard();
      expect(() => guard.canActivate(makeCtx())).toThrow(UnauthorizedException);
    });
  });

  describe('when INTERNAL_TICK_API_KEY is configured and the request has a wrong key', () => {
    it('should throw UnauthorizedException', () => {
      process.env['INTERNAL_TICK_API_KEY'] = 'secret';
      const guard = new InternalApiKeyGuard();
      expect(() => guard.canActivate(makeCtx({ 'x-api-key': 'wrong' }))).toThrow(
        UnauthorizedException,
      );
    });
  });
});
