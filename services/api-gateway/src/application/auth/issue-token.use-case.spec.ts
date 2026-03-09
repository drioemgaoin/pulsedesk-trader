import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IssueTokenUseCase } from './issue-token.use-case';

const mockJwt = { sign: jest.fn().mockReturnValue('signed-token') } as unknown as JwtService;

describe('IssueTokenUseCase', () => {
  let useCase: IssueTokenUseCase;

  beforeEach(() => {
    process.env['DEMO_USERNAME'] = 'trader';
    process.env['DEMO_PASSWORD'] = 'pulsedesk';
    useCase = new IssueTokenUseCase(mockJwt);
  });

  it('returns accessToken for valid credentials', () => {
    const result = useCase.execute('trader', 'pulsedesk');
    expect(result.accessToken).toBe('signed-token');
    expect(mockJwt.sign).toHaveBeenCalledWith({ sub: 'trader' });
  });

  it('throws UnauthorizedException for wrong username', () => {
    expect(() => useCase.execute('wrong', 'pulsedesk')).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for wrong password', () => {
    expect(() => useCase.execute('trader', 'wrong')).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for empty credentials', () => {
    expect(() => useCase.execute('', '')).toThrow(UnauthorizedException);
  });
});
