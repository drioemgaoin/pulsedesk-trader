# api-gateway

The single public-facing entry point for the PulseDesk Trader platform — authenticates every request, enforces per-identity rate limiting, and reverse-proxies traffic to downstream microservices.

## Responsibilities

- Issue short-lived JWTs for demo/local accounts via `POST /api/v1/auth/token`
- Validate Bearer tokens on every protected route using Passport/JWT strategy
- Rate-limit requests per authenticated user (or IP when unauthenticated) using NestJS Throttler backed by Valkey (Redis)
- Proxy `/api/v1/orders/*` traffic to order-service with IDOR checks (JWT subject must match `accountId`)
- Proxy `/api/v1/positions` to portfolio-service, deriving `accountId` from the JWT subject (never from a query param)
- Serve the watchlist snapshot from market-data-service with a 1-second Valkey cache-aside layer
- Apply per-upstream opossum circuit breakers (order: 5 s timeout / 100 cap, portfolio: 3 s timeout / 50 cap)
- Attach/echo `x-request-id` correlation headers for distributed tracing
- Expose Swagger UI at `/docs`
- Expose Prometheus metrics at `/metrics` and health probes at `/health/live` and `/health/ready`

## Architecture & Design Decisions

### Fastify over Express

NestJS supports both adapters. Fastify is chosen here because its schema-based serialization and low-overhead routing deliver roughly 2x the raw throughput of Express in benchmarks. For a gateway that sits in front of every user request, that headroom matters.

### Identity-based throttling

`IdentityThrottleGuard` extends `ThrottlerGuard` and uses the JWT `sub` (user ID) as the rate-limit key, falling back to the source IP for unauthenticated callers. This means a single user cannot bypass the limit by rotating IPs, and different users share no bucket.

Rate-limit state is stored in Valkey so that multiple gateway replicas share a consistent view. The `@nest-lab/throttler-storage-redis` adapter is wired in `AppModule` with the `ioredis` client.

### Circuit breakers (opossum)

The `CircuitBreakerRegistry` lazily creates one opossum breaker per upstream origin and wraps every outbound `ProxyService.forward()` call. Configuration:

| Upstream | Timeout | Bulkhead cap | Error threshold | Reset timeout |
|---|---|---|---|---|
| order-service | 5 000 ms | 100 | 50 % | 15 s |
| portfolio-service | 3 000 ms | 50 | 50 % | 15 s |
| others | 5 000 ms | 50 | 50 % | 15 s |

When the circuit is open or the bulkhead is full, the gateway returns HTTP 503 immediately rather than queuing requests that will time out anyway. This prevents a slow downstream from exhausting gateway threads and cascading into a full outage.

### IDOR protection

The gateway performs object-level ownership checks before forwarding:

- `GET /api/v1/orders?accountId=X` — rejects if `X !== jwt.sub`
- `GET /api/v1/orders/:id` and `POST /api/v1/orders/:id/cancel` — fetches the order first, then compares `order.accountId` against `jwt.sub`
- `GET /api/v1/positions` — always derives the account from `jwt.sub`; no query param is accepted

### Watchlist cache

The gateway caches the full market snapshot from market-data-service in Valkey for 1 second. Symbol filtering is applied in-process on the cached result, avoiding a round-trip per symbol combination. The cache key is constant (single shared snapshot); TTL is kept short enough to be practically real-time.

### Graceful shutdown

On SIGTERM the service immediately marks the readiness probe as NOT_READY (Kubernetes stops routing traffic) and arms a hard exit after 25 seconds. NestJS lifecycle hooks drain in-flight requests. This allows rolling deployments without dropped connections.

## HTTP API

> All routes except `POST /api/v1/auth/token` require `Authorization: Bearer <jwt>`.

### Auth

```
POST /api/v1/auth/token
Body: { "username": "alice", "password": "secret" }
Response 200: { "accessToken": "<jwt>" }
```

Issues a JWT signed with `JWT_SECRET`. This is a demo mechanism — no database lookup, credentials are validated against the hardcoded local profile.

### Orders

```
GET  /api/v1/orders?accountId=<id>[&status=PENDING,FILLED][&limit=50][&offset=0]
POST /api/v1/orders
     Body: { commandId, accountId, symbol, side, type, quantity, limitPrice? }
     Response 201: OrderResponseDto
GET  /api/v1/orders/:id
POST /api/v1/orders/:id/cancel
```

All order routes are rate-limited and enforce IDOR. Proxied to order-service.

### Positions

```
GET /api/v1/positions
Response 200: PositionsResponseV1
```

Returns positions and unrealised P&L for the authenticated account. Proxied to portfolio-service.

### Watchlist

```
GET /api/v1/watchlist[?symbols=AAPL,MSFT]
Response 200: WatchlistResponseV1
```

Returns the latest market snapshot. `symbols` is an optional comma-separated filter applied after the Valkey cache hit. Proxied to market-data-service on cache miss.

### Infrastructure

```
GET /health/live      — liveness (always 200 once the process is up)
GET /health/ready     — readiness (200 | 503 depending on ReadinessService state)
GET /metrics          — Prometheus text format
GET /docs             — Swagger UI
```

## Kafka Topics

This service does not produce or consume any Kafka topics.

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `JWT_SECRET` | — | **Required in production.** HMAC secret for JWT signing/verification |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime (any value accepted by `jsonwebtoken`) |
| `THROTTLE_TTL_MS` | `60000` | Rate-limit window in milliseconds |
| `THROTTLE_LIMIT` | `100` | Max requests per window per identity |
| `VALKEY_URL` | `redis://localhost:6379` | Valkey/Redis URL for throttler storage and watchlist cache |
| `ORDER_SERVICE_URL` | `http://localhost:3012` | Base URL of order-service |
| `PORTFOLIO_SERVICE_URL` | `http://localhost:3015` | Base URL of portfolio-service |
| `MARKET_DATA_SERVICE_URL` | `http://localhost:3011` | Base URL of market-data-service |
| `CORS_ORIGIN` | `*` | Allowed CORS origin. Must be set explicitly in `NODE_ENV=production` |
| `SHUTDOWN_TIMEOUT_MS` | `25000` | Hard exit timeout after SIGTERM |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint for traces, metrics, and logs |
| `NODE_ENV` | `development` | Environment name |

## Running Locally

### Standalone (pnpm)

```bash
# From the monorepo root
pnpm --filter @pulsedesk/api-gateway start:dev
```

The service starts on port 3000 with hot-reload. Swagger is available at `http://localhost:3000/docs`.

Ensure Valkey is reachable at `redis://localhost:6379` (or set `VALKEY_URL`). Downstream services can be stubbed or running.

### Via Docker Compose

```bash
# From the monorepo root
docker compose up api-gateway
```

This starts the service with all dependencies (Valkey, downstream services) wired via the Docker Compose network.

## Running Tests

```bash
# Unit tests
pnpm --filter @pulsedesk/api-gateway test

# With coverage
pnpm --filter @pulsedesk/api-gateway test:cov
```

Tests use Jest with `ts-jest`. The test suite covers the JWT strategy, IDOR enforcement logic in controllers, circuit-breaker registry, throttle guard, Valkey cache adapter, and resilience interceptors.

## Notable Implementation Details

- **Correlation IDs**: A Fastify `onRequest` hook generates a UUID v4 `x-request-id` if the client does not supply one. The ID is echoed in the response header and propagated to downstream services via the proxy.
- **`@Public()` decorator**: Routes decorated with `@Public()` skip the global JWT guard. Currently only `POST /api/v1/auth/token` is public.
- **Swagger in production**: The Swagger document is registered unconditionally. Restrict access at the load-balancer level in production environments.
- **OTel instrumentation**: `instrumentation.ts` is loaded via `--require` before `main.ts`, ensuring the SDK captures all module initialisation traces. The file is compiled to `dist/instrumentation.js` by the NestJS build.

## Dependencies

### Framework

| Package | Why |
|---------|-----|
| `@nestjs/common`, `@nestjs/core` | Structured DI framework with decorators that enforces consistent module/controller/service boundaries. Chosen over raw Fastify because this service is the most complex in the platform (auth + rate limiting + proxying + circuit breakers) and DI keeps each concern independently testable. |
| `@nestjs/platform-fastify`, `fastify` | Fastify as the HTTP engine instead of Express. Delivers ~2x throughput in benchmarks, ships with native JSON schema validation, and includes Pino as its default logger — all relevant for a gateway that sits in front of every user request. |
| `@nestjs/axios` | Wraps Axios as an injectable NestJS service for proxying HTTP calls to downstream services. Integrates with the DI container and returns RxJS Observables, matching how NestJS interceptors expect to compose async operations. |
| `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` | JWT validation for every incoming request. NestJS guards wrap Passport strategies cleanly — `JwtAuthGuard` is a one-liner on any controller. `passport-jwt` handles token extraction and verification; `@nestjs/passport` bridges it into NestJS's guard system. |
| `@nestjs/throttler`, `@nest-lab/throttler-storage-redis` | Rate limiting per authenticated identity. The base throttler provides the guard; `throttler-storage-redis` uses Valkey as the shared counter store so limits are enforced consistently across all replicas — without the Redis adapter each replica would have its own counter and the effective limit would multiply by replica count. |
| `@nestjs/swagger` | Auto-generates an OpenAPI spec from decorators. The `/docs` endpoint is live with no extra work beyond annotating DTOs and controllers. |
| `reflect-metadata` | Enables TypeScript's `emitDecoratorMetadata` — required by every NestJS decorator (`@Inject`, `@Controller`, etc.). Must be the first import in the entry point. |
| `rxjs` | NestJS internals and `@nestjs/axios` use RxJS Observables for lifecycle events and HTTP responses. Not used directly in business code but required by the framework. |

### HTTP & Security

| Package | Why |
|---------|-----|
| `@fastify/cors` | Standard CORS headers. Frontend dev servers run on ports 5173–5177, which are different origins from the API on 3000, making this mandatory. |
| `@fastify/helmet` | Sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) in a single call — no need to set each header manually. |
| `@fastify/static` | Serves the compiled OpenAPI JSON file as a static asset for the Swagger UI. |
| `@types/passport-jwt` | TypeScript types for the JWT payload shape used in `JwtStrategy`. Ships as a runtime dep because the types are referenced in compiled code. |

### Auth & Validation

| Package | Why |
|---------|-----|
| `class-validator`, `class-transformer` | Declarative validation via decorators on DTO classes. Works natively with NestJS's `ValidationPipe` — incoming JSON is automatically validated and deserialized with a single pipe registration. Eliminates manual `if (!body.symbol)` checks. |

### Resilience

| Package | Why |
|---------|-----|
| `opossum` | Circuit breaker for order-service and portfolio-service HTTP calls. When a downstream is slow or down, opossum fails fast instead of allowing threads to pile up waiting for timeouts. Chosen over `cockatiel` for its maturity and first-class Prometheus metric integration. |
| `p-retry` | Automatic retry with exponential backoff for transient outbound HTTP failures. Separate from the circuit breaker — retries handle temporary blips before the circuit opens. |
| `ioredis` | Redis/Valkey client used for two purposes: the `throttler-storage-redis` counter backend and the watchlist cache-aside layer (1-second TTL). Chosen over `node-redis` for superior TypeScript types, pipeline API, and cluster mode support. |

### Observability

| Package | Why |
|---------|-----|
| `nestjs-pino`, `pino`, `pino-http` | Structured JSON logging. Pino serialises to JSON asynchronously via a worker thread, with virtually no impact on request latency. `nestjs-pino` registers Pino as the NestJS `Logger` implementation; `pino-http` adds request/response log lines with timing. Logs flow to stdout → Docker log driver → Loki. |
| `@opentelemetry/auto-instrumentations-node` | Zero-code instrumentation — automatically traces HTTP requests, outbound Axios calls, and Redis operations without any `span.start()` calls in business code. |
| `@opentelemetry/sdk-node` | Bootstraps the OTel trace/metric/log providers at process start, wiring together all exporters and instrumentations. |
| `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/exporter-logs-otlp-http` | Send telemetry to the OTel Collector over OTLP/HTTP. Using the vendor-neutral OTLP protocol means switching backends (e.g., Tempo → Jaeger, Prometheus → Grafana Cloud) is a collector config change — no code changes required. |
| `@opentelemetry/sdk-logs`, `@opentelemetry/sdk-metrics` | Provider implementations for the log and metric pipelines. Required alongside `sdk-node` to enable OTel logs and metrics export in addition to traces. |

### Internal

| Package | Why |
|---------|-----|
| `@pulsedesk/contracts` | Shared TypeScript types for inter-service event and API shapes. Ensures the gateway's request/response DTOs stay in sync with what downstream services produce and consume. |

### Dev / build

| Package | Why |
|---------|-----|
| `@nestjs/cli`, `@nestjs/schematics` | NestJS build toolchain (`nest build`, `nest start --watch`). `schematics` is required by the CLI for code generation. |
| `@nestjs/testing` | Provides `Test.createTestingModule()` for spinning up isolated NestJS module contexts in unit tests without starting the full HTTP server. |
| `ts-jest` | TypeScript preprocessor for Jest. Chosen over `babel-jest` + `@babel/preset-typescript` because it performs full type checking during tests, catching type errors that Babel silently strips. |
| `jest`, `@types/jest` | Test runner. Standard in the NestJS ecosystem; integrates directly with `ts-jest` and `@nestjs/testing`. |
| `pino-pretty` | Pretty-prints Pino JSON logs in the terminal during local development. Disabled in production — `NODE_ENV=production` pipes raw JSON to stdout for the log driver. |
| `@types/opossum` | TypeScript type definitions for the `opossum` circuit breaker library. |
| `typescript` | TypeScript compiler. All services in this monorepo use `~5.7.0` for consistency. |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting. `typescript-eslint` enables TypeScript-aware lint rules (e.g., no implicit `any`, consistent type assertions). |
| `@types/node` | Node.js built-in type definitions required by TypeScript for `process`, `Buffer`, etc. |
