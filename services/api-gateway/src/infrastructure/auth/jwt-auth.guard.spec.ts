import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

const makeContext = (): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('Given a JwtAuthGuard instance', () => {
  describe('when the route is decorated with @Public()', () => {
    it('should return true without invoking the passport strategy', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(true),
      } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector);
      expect(guard.canActivate(makeContext())).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        expect.anything(),
        expect.anything(),
      ]);
    });
  });

  describe('when the route requires authentication', () => {
    it('should delegate to the passport strategy', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proto = Object.getPrototypeOf(JwtAuthGuard.prototype) as any;
      const spy = jest.spyOn(proto, 'canActivate').mockReturnValue(true);
      guard.canActivate(makeContext());
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
