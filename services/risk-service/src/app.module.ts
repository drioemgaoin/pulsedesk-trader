import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ReadinessService } from './app.readiness';
import { EvaluateRiskUseCase } from './application/use-cases/evaluate-risk.use-case';
import { RISK_METRICS } from './domain/ports/risk-metrics.port';
import { RiskMetricsService } from './infrastructure/metrics/risk-metrics.service';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';
import { RiskController } from './interfaces/http/risk.controller';

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
  controllers: [HealthController, ReadyController, MetricsController, RiskController],
  providers: [
    ReadinessService,
    RiskMetricsService,
    { provide: RISK_METRICS, useExisting: RiskMetricsService },
    EvaluateRiskUseCase,
  ],
})
export class AppModule {}
