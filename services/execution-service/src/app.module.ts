import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ReadinessService } from './app.readiness';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';
import { PrismaService } from './infrastructure/persistence/prisma.provider';
import { PrismaExecutionRepository } from './infrastructure/persistence/prisma-execution.repository';
import { InMemoryMarketPriceCache } from './infrastructure/cache/in-memory-market-price-cache';
import { InMemoryLimitOrderQueue } from './infrastructure/queue/in-memory-limit-order-queue';
import { KafkaFillEventPublisher } from './infrastructure/messaging/kafka-fill-event-publisher';
import { KafkaOrderEventConsumer } from './infrastructure/messaging/kafka-order-event-consumer';
import { KafkaMarketTickConsumer } from './infrastructure/messaging/kafka-market-tick-consumer';
import { ProcessOrderUseCase } from './application/use-cases/process-order.use-case';
import { MatchLimitOrdersUseCase } from './application/use-cases/match-limit-orders.use-case';
import { EXECUTION_REPOSITORY } from './domain/ports/execution-repository.port';
import { FILL_EVENT_PUBLISHER } from './domain/ports/fill-event-publisher.port';
import { MARKET_PRICE_CACHE } from './domain/ports/market-price-cache.port';
import { LIMIT_ORDER_QUEUE } from './domain/ports/limit-order-queue.port';

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
  controllers: [HealthController, ReadyController, MetricsController],
  providers: [
    ReadinessService,
    PrismaService,
    { provide: EXECUTION_REPOSITORY, useClass: PrismaExecutionRepository },
    { provide: MARKET_PRICE_CACHE, useClass: InMemoryMarketPriceCache },
    { provide: FILL_EVENT_PUBLISHER, useClass: KafkaFillEventPublisher },
    { provide: LIMIT_ORDER_QUEUE, useClass: InMemoryLimitOrderQueue },
    ProcessOrderUseCase,
    MatchLimitOrdersUseCase,
    KafkaOrderEventConsumer,
    KafkaMarketTickConsumer,
  ],
})
export class AppModule {}
