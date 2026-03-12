import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ReadinessService } from './app.readiness';
import { MARKET_TICK_BROADCASTER } from './domain/ports/market-tick-broadcaster.port';
import { KafkaMarketTickConsumer } from './infrastructure/messaging/kafka-market-tick-consumer';
import { KafkaOrderFilledConsumer } from './infrastructure/messaging/kafka-order-filled-consumer';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';
import { MarketStreamGateway } from './interfaces/ws/market-stream.gateway';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
  ],
  controllers: [HealthController, ReadyController, MetricsController],
  providers: [
    ReadinessService,
    MarketStreamGateway,
    { provide: MARKET_TICK_BROADCASTER, useExisting: MarketStreamGateway },
    KafkaMarketTickConsumer,
    KafkaOrderFilledConsumer,
  ],
})
export class AppModule {}
