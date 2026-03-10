import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ReadinessService } from './app.readiness';
import { SubmitOrderUseCase } from './application/use-cases/submit-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { PrismaService } from './infrastructure/persistence/prisma.provider';
import { PrismaOrderRepository } from './infrastructure/persistence/prisma-order.repository';
import { ORDER_REPOSITORY } from './domain/ports/order-repository.port';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';
import { OrdersController } from './interfaces/http/orders.controller';

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
  controllers: [HealthController, ReadyController, MetricsController, OrdersController],
  providers: [
    ReadinessService,
    PrismaService,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    SubmitOrderUseCase,
    GetOrderUseCase,
  ],
})
export class AppModule {}
