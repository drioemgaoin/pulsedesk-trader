import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EvaluateRiskUseCase } from '../../application/use-cases/evaluate-risk.use-case';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { EvaluateRiskDto } from './dto/evaluate-risk.dto';
import { RiskDecisionResponseDto } from './dto/risk-decision-response.dto';

@ApiTags('risk')
@UseGuards(InternalApiKeyGuard)
@Controller('v1/risk')
export class RiskController {
  constructor(private readonly evaluateRisk: EvaluateRiskUseCase) {}

  @Post('evaluate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Evaluate pre-trade risk for an order' })
  evaluate(@Body() dto: EvaluateRiskDto): RiskDecisionResponseDto {
    const decision = this.evaluateRisk.execute({
      orderId: dto.orderId,
      commandId: dto.commandId,
      symbol: dto.symbol,
      quantity: dto.quantity,
      limitPrice: dto.limitPrice ?? null,
    });
    return RiskDecisionResponseDto.fromDomain(decision);
  }
}
