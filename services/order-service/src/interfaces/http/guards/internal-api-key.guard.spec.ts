import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalApiKeyGuard } from './internal-api-key.guard';

const makeCtx = (headers: Record<string, string>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('Given INTERNAL_ORDER_API_KEY is not set', () => {
  describe('when a request arrives without an api key header', () => {
    it('should allow the request through', () => {
      process.env['INTERNAL_ORDER_API_KEY'] = '';
      expect(new InternalApiKeyGuard().canActivate(makeCtx({}))).toBe(true);
    });
  });
});

describe('Given INTERNAL_ORDER_API_KEY is configured', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, INTERNAL_ORDER_API_KEY: 'secret' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('when a request arrives with the correct api key', () => {
    it('should allow the request through', () => {
      expect(new InternalApiKeyGuard().canActivate(makeCtx({ 'x-api-key': 'secret' }))).toBe(true);
    });
  });

  describe('when a request arrives with a wrong api key', () => {
    it('should throw UnauthorizedException', () => {
      expect(() => new InternalApiKeyGuard().canActivate(makeCtx({ 'x-api-key': 'wrong' })))
        .toThrow(UnauthorizedException);
    });
  });

  describe('when a request arrives with no api key header', () => {
    it('should throw UnauthorizedException', () => {
      expect(() => new InternalApiKeyGuard().canActivate(makeCtx({})))
        .toThrow(UnauthorizedException);
    });
  });
});
