import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NormalizeTickUseCase } from '../../application/normalize-tick.use-case';
import { ProcessTickUseCase } from '../../application/process-tick.use-case';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

@ApiTags('market-data')
@Controller()
export class TicksController {
  constructor(
    private readonly normalize: NormalizeTickUseCase,
    private readonly processTick: ProcessTickUseCase,
  ) {}

  @Post('ticks')
  @HttpCode(202)
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Ingest a single tick (testing / external feed)' })
  async ingest(@Body() body: unknown): Promise<{ accepted: boolean }> {
    const tick = this.normalize.execute(body);
    if (!tick) {
      throw new BadRequestException('Invalid tick payload');
    }
    await this.processTick.execute(tick);
    return { accepted: true };
  }
}
