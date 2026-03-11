import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { HttpModule } from '@nestjs/axios';
import { LoggerModule } from 'nestjs-pino';
import Redis from 'ioredis';

import { ReadinessService } from './app.readiness';
import { HealthController } from './interfaces/http/health.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { ReadyController } from './interfaces/http/ready.controller';
import { AuthController } from './interfaces/http/auth.controller';
import { OrdersController } from './interfaces/http/orders.controller';
import { PositionsController } from './interfaces/http/positions.controller';
import { WatchlistController } from './interfaces/http/watchlist.controller';

import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/auth/jwt-auth.guard';
import { IdentityThrottleGuard } from './infrastructure/throttle/identity-throttle.guard';
import {
  ValkeyWatchlistCacheAdapter,
  VALKEY_CLIENT,
} from './infrastructure/cache/valkey-watchlist-cache.adapter';
import { WATCHLIST_CACHE } from './application/cache/watchlist-cache.port';
import { IssueTokenUseCase } from './application/auth/issue-token.use-case';
import { ProxyService } from './application/proxy/proxy.service';
import { CircuitBreakerRegistry } from './infrastructure/resilience/circuit-breaker.registry';
import { LoadSheddingInterceptor } from './infrastructure/resilience/load-shedding.interceptor';

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

    PassportModule,

    JwtModule.register({
      secret: process.env['JWT_SECRET'] ?? 'local-dev-secret-change-in-prod',
      signOptions: {
        expiresIn: parseInt(process.env['JWT_EXPIRY_SECONDS'] ?? '3600', 10),
      },
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(
            process.env['GATEWAY_RATE_LIMIT_WINDOW_MS'] ?? '60000',
            10,
          ),
          limit: parseInt(process.env['GATEWAY_RATE_LIMIT_MAX'] ?? '100', 10),
        },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis({
          host: process.env['VALKEY_HOST'] ?? 'localhost',
          port: parseInt(process.env['VALKEY_PORT'] ?? '6379', 10),
          lazyConnect: true,
        }),
      ),
    }),

    HttpModule,
  ],
  controllers: [
    HealthController,
    ReadyController,
    MetricsController,
    AuthController,
    OrdersController,
    PositionsController,
    WatchlistController,
  ],
  providers: [
    ReadinessService,
    JwtStrategy,
    IdentityThrottleGuard,
    IssueTokenUseCase,
    CircuitBreakerRegistry,
    ProxyService,
    { provide: APP_INTERCEPTOR, useClass: LoadSheddingInterceptor },
    {
      provide: VALKEY_CLIENT,
      useFactory: () =>
        new Redis({
          host: process.env['VALKEY_HOST'] ?? 'localhost',
          port: parseInt(process.env['VALKEY_PORT'] ?? '6379', 10),
          lazyConnect: true,
        }),
    },
    { provide: WATCHLIST_CACHE, useClass: ValkeyWatchlistCacheAdapter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
