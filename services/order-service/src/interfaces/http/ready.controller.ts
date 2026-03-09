import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { ReadinessService } from '../../app.readiness';

@ApiTags('ops')
@Controller()
export class ReadyController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get('ready')
  @HttpCode(200)
  @ApiOperation({ summary: 'Readiness probe — 503 during drain' })
  ready(@Res() reply: FastifyReply): void {
    if (this.readiness.isReady()) {
      void reply.status(200).send({ status: 'ready' });
    } else {
      void reply.status(503).send({ status: 'not ready' });
    }
  }
}
