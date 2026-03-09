import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ReadinessService } from './app.readiness';
import { TICK_METRICS } from './application/ports/metrics.port';
import { GetWatchlistUseCase } from './application/get-watchlist.use-case';
import { NormalizeTickUseCase } from './application/normalize-tick.use-case';
import { ProcessTickUseCase } from './application/process-tick.use-case';
import { TickSimulatorService } from './application/tick-simulator.service';
import { TICK_PUBLISHER } from './domain/ports/tick-publisher.port';
import { TICK_STORE } from './domain/ports/tick-store.port';
import { TickMetricsService } from './infrastructure/metrics/tick-metrics.service';
import { InMemoryTickStore } from './infrastructure/tick/in-memory-tick-store';
import { NullTickPublisher } from './infrastructure/tick/null-tick-publisher';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';
import { TicksController } from './interfaces/http/ticks.controller';
import { WatchlistController } from './interfaces/http/watchlist.controller';

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
  controllers: [
    HealthController,
    ReadyController,
    MetricsController,
    WatchlistController,
    TicksController,
  ],
  providers: [
    ReadinessService,
    TickMetricsService,
    { provide: TICK_METRICS, useExisting: TickMetricsService },
    { provide: TICK_STORE, useClass: InMemoryTickStore },
    { provide: TICK_PUBLISHER, useClass: NullTickPublisher },
    NormalizeTickUseCase,
    ProcessTickUseCase,
    GetWatchlistUseCase,
    TickSimulatorService,
  ],
})
export class AppModule {}
