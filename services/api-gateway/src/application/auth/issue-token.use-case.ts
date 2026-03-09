import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class IssueTokenUseCase {
  constructor(private readonly jwt: JwtService) {}

  execute(username: string, password: string): { accessToken: string } {
    const expectedUser =
      process.env['DEMO_USERNAME'] ?? 'trader';
    const expectedPass =
      process.env['DEMO_PASSWORD'] ?? 'pulsedesk';

    if (username !== expectedUser || password !== expectedPass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwt.sign({ sub: username });
    return { accessToken };
  }
}
