import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PositionsResponseV1 } from '@pulsedesk/contracts';
import { GetPositionsQuery } from '../../application/queries/get-positions.query';

@ApiTags('positions')
@Controller('v1/positions')
export class PositionsController {
  constructor(private readonly getPositions: GetPositionsQuery) {}

  @Get(':accountId')
  @ApiOperation({ summary: 'Get positions for an account' })
  getPositions_(@Param('accountId') accountId: string): Promise<PositionsResponseV1> {
    return this.getPositions.execute(accountId);
  }
}
