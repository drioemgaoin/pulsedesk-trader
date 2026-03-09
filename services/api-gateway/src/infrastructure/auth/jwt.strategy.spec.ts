import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('validate returns sub from payload', () => {
    process.env['JWT_SECRET'] = 'test-secret';
    const strategy = new JwtStrategy();
    const result = strategy.validate({ sub: 'trader', iat: 0, exp: 9999 });
    expect(result).toEqual({ sub: 'trader' });
  });

  it('constructs with fallback secret when JWT_SECRET is unset', () => {
    delete process.env['JWT_SECRET'];
    expect(() => new JwtStrategy()).not.toThrow();
    process.env['JWT_SECRET'] = 'test-secret';
  });
});
