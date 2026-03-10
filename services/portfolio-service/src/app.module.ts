import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ReadinessService } from './app.readiness';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';
import { PositionsController } from './interfaces/http/positions.controller';
import { PrismaService } from './infrastructure/persistence/prisma.provider';
import { PrismaPositionRepository } from './infrastructure/persistence/prisma-position.repository';
import { InMemoryMarketPriceCache } from './infrastructure/cache/in-memory-market-price-cache';
import { KafkaFillEventConsumer } from './infrastructure/messaging/kafka-fill-event-consumer';
import { KafkaMarketTickConsumer } from './infrastructure/messaging/kafka-market-tick-consumer';
import { ProcessFillUseCase } from './application/use-cases/process-fill.use-case';
import { GetPositionsQuery } from './application/queries/get-positions.query';
import { POSITION_REPOSITORY } from './domain/ports/position-repository.port';
import { MARKET_PRICE_CACHE } from './domain/ports/market-price-cache.port';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport: process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
      },
    }),
  ],
  controllers: [HealthController, ReadyController, MetricsController, PositionsController],
  providers: [
    ReadinessService,
    PrismaService,
    { provide: POSITION_REPOSITORY, useClass: PrismaPositionRepository },
    { provide: MARKET_PRICE_CACHE, useClass: InMemoryMarketPriceCache },
    ProcessFillUseCase,
    GetPositionsQuery,
    KafkaFillEventConsumer,
    KafkaMarketTickConsumer,
  ],
})
export class AppModule {}
