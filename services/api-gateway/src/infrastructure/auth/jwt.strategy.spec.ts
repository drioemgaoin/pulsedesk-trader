import { JwtStrategy } from './jwt.strategy';

describe('Given a configured JwtStrategy', () => {
  describe('when validate is called with a valid payload', () => {
    it('should return an object containing the sub claim', () => {
      process.env['JWT_SECRET'] = 'test-secret';
      const strategy = new JwtStrategy();
      const result = strategy.validate({ sub: 'trader', iat: 0, exp: 9999 });
      expect(result).toEqual({ sub: 'trader' });
    });
  });

  describe('when JWT_SECRET is not set in the environment', () => {
    it('should construct without throwing', () => {
      delete process.env['JWT_SECRET'];
      expect(() => new JwtStrategy()).not.toThrow();
      process.env['JWT_SECRET'] = 'test-secret';
    });
  });
});
