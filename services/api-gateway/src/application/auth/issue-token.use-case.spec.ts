import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IssueTokenUseCase } from './issue-token.use-case';

const mockJwt = { sign: jest.fn().mockReturnValue('signed-token') } as unknown as JwtService;

describe('Given demo credentials are configured', () => {
  let useCase: IssueTokenUseCase;

  beforeEach(() => {
    process.env['DEMO_USERNAME'] = 'trader';
    process.env['DEMO_PASSWORD'] = 'pulsedesk';
    useCase = new IssueTokenUseCase(mockJwt);
  });

  describe('when execute is called with correct credentials', () => {
    it('should return a signed accessToken', () => {
      const result = useCase.execute('trader', 'pulsedesk');
      expect(result.accessToken).toBe('signed-token');
      expect(mockJwt.sign).toHaveBeenCalledWith({ sub: 'trader' });
    });
  });

  describe('when execute is called with a wrong username', () => {
    it('should throw UnauthorizedException', () => {
      expect(() => useCase.execute('wrong', 'pulsedesk')).toThrow(UnauthorizedException);
    });
  });

  describe('when execute is called with a wrong password', () => {
    it('should throw UnauthorizedException', () => {
      expect(() => useCase.execute('trader', 'wrong')).toThrow(UnauthorizedException);
    });
  });

  describe('when execute is called with empty credentials', () => {
    it('should throw UnauthorizedException', () => {
      expect(() => useCase.execute('', '')).toThrow(UnauthorizedException);
    });
  });
});
