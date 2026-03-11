import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { IdentityThrottleGuard } from '../../infrastructure/throttle/identity-throttle.guard';
import { ProxyService } from '../../application/proxy/proxy.service';
import type { JwtPayload } from '../../infrastructure/auth/jwt.strategy';

const PORTFOLIO_URL =
  process.env['PORTFOLIO_SERVICE_URL'] ?? 'http://localhost:3015';

@ApiTags('positions')
@ApiBearerAuth()
@UseGuards(IdentityThrottleGuard)
@Controller('api/v1/positions')
export class PositionsController {
  constructor(private readonly proxy: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get positions and PnL snapshot for the authenticated account' })
  get(@Req() req: FastifyRequest): Promise<unknown> {
    // Derive accountId from JWT subject — never accept it as a query param.
    // This enforces IDOR: a user can only read their own positions.
    const jwtUser = (req as FastifyRequest & { user?: JwtPayload }).user;
    if (!jwtUser?.sub) {
      throw new UnauthorizedException('Missing identity');
    }
    return this.proxy.forward(
      req,
      `${PORTFOLIO_URL}/v1/positions/${encodeURIComponent(jwtUser.sub)}`,
      'GET',
    );
  }
}
