import { UnauthorizedException } from '@nestjs/common';
import { IssueTokenUseCase } from '../../application/auth/issue-token.use-case';
import { AuthController } from './auth.controller';

const mockUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<IssueTokenUseCase>;

describe('Given an AuthController instance', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController(mockUseCase);
    jest.clearAllMocks();
  });

  describe('when token is called with valid credentials', () => {
    it('should return the accessToken from the use case', () => {
      (mockUseCase.execute as jest.Mock).mockReturnValue({ accessToken: 'tok' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = controller.token({ username: 'trader', password: 'pulsedesk' } as any);
      expect(mockUseCase.execute).toHaveBeenCalledWith('trader', 'pulsedesk');
      expect(result).toEqual({ accessToken: 'tok' });
    });
  });

  describe('when the use case throws UnauthorizedException', () => {
    it('should propagate the exception to the caller', () => {
      (mockUseCase.execute as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedException();
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => controller.token({ username: 'bad', password: 'bad' } as any)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
