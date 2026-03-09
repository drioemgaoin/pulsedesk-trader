import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('ops')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
