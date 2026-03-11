import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { MarketStreamGateway } from '../ws/market-stream.gateway';

@Controller()
export class MetricsController {
  constructor(private readonly gateway: MarketStreamGateway) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint()
  metrics(): string {
    const { activeConnections, messagesSent, droppedMessages } = this.gateway.getMetrics();
    return [
      '# HELP ws_active_connections Current number of connected WebSocket clients',
      '# TYPE ws_active_connections gauge',
      `ws_active_connections ${activeConnections}`,
      '# HELP ws_messages_sent_total Total messages successfully sent to clients',
      '# TYPE ws_messages_sent_total counter',
      `ws_messages_sent_total ${messagesSent}`,
      '# HELP ws_messages_dropped_total Messages dropped due to slow consumer backpressure',
      '# TYPE ws_messages_dropped_total counter',
      `ws_messages_dropped_total ${droppedMessages}`,
      '',
    ].join('\n');
  }
}
