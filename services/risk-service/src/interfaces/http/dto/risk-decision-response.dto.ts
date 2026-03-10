import { ApiProperty } from '@nestjs/swagger';
import { RiskDecision } from '../../../domain/risk-decision';

export class RiskDecisionResponseDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  outcome!: string;

  @ApiProperty({ description: 'Machine-readable reason code' })
  reasonCode!: string;

  @ApiProperty({ type: [String], description: 'Human-readable rejection reasons' })
  reasons!: string[];

  static fromDomain(decision: RiskDecision): RiskDecisionResponseDto {
    const dto = new RiskDecisionResponseDto();
    dto.outcome = decision.outcome;
    dto.reasonCode = decision.reasonCode;
    dto.reasons = decision.reasons;
    return dto;
  }
}
