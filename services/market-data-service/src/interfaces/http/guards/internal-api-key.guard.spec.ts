import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { InternalApiKeyGuard } from './internal-api-key.guard';

const makeCtx = (headers: Record<string, string> = {}): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('InternalApiKeyGuard', () => {
  const ORIGINAL = process.env['INTERNAL_TICK_API_KEY'];

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env['INTERNAL_TICK_API_KEY'];
    } else {
      process.env['INTERNAL_TICK_API_KEY'] = ORIGINAL;
    }
  });

  it('allows all requests when INTERNAL_TICK_API_KEY is not set', () => {
    delete process.env['INTERNAL_TICK_API_KEY'];
    const guard = new InternalApiKeyGuard();
    expect(guard.canActivate(makeCtx())).toBe(true);
  });

  it('allows request with matching key', () => {
    process.env['INTERNAL_TICK_API_KEY'] = 'secret';
    const guard = new InternalApiKeyGuard();
    expect(guard.canActivate(makeCtx({ 'x-api-key': 'secret' }))).toBe(true);
  });

  it('throws UnauthorizedException when key is missing', () => {
    process.env['INTERNAL_TICK_API_KEY'] = 'secret';
    const guard = new InternalApiKeyGuard();
    expect(() => guard.canActivate(makeCtx())).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when key is wrong', () => {
    process.env['INTERNAL_TICK_API_KEY'] = 'secret';
    const guard = new InternalApiKeyGuard();
    expect(() => guard.canActivate(makeCtx({ 'x-api-key': 'wrong' }))).toThrow(
      UnauthorizedException,
    );
  });
});
