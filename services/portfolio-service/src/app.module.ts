import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ReadinessService } from './app.readiness';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';

/**
 * Root module.
 * Domain, application, and infrastructure modules are wired here as the
 * platform grows. Clean architecture boundary: no domain/application logic
 * belongs in this module definition.
 *
 * Layer placeholders:
 *   src/domain/          — entities, value objects, domain events
 *   src/application/     — use-cases, ports (interfaces), commands/queries
 *   src/infrastructure/  — adapters: Prisma, KafkaJS, Valkey, HTTP clients
 */
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
  providers: [ReadinessService],
})
export class AppModule {}
