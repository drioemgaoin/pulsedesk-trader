import { Module } from '@nestjs/common';
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
  imports: [],
  controllers: [HealthController, ReadyController, MetricsController],
  providers: [ReadinessService],
})
export class AppModule {}
