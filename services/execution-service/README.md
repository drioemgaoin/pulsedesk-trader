# execution-service

Matches accepted orders against real-time market prices — filling MARKET orders immediately and queuing LIMIT orders in memory until their price condition is met — then persists each fill to PostgreSQL and publishes an `OrderFilled` event to Kafka.

## Responsibilities

- Consume `OrderAccepted` events from `orders.events.v1`
- Fill MARKET orders immediately at the current market price from the in-memory price cache
- Queue LIMIT orders in an in-memory structure when their price condition is not yet met
- On every `market.ticks.v1` event, update the cached market price for each symbol and sweep the limit order queue, filling any orders whose condition is now satisfied
- LIMIT fill condition: BUY fills when `marketPrice <= limitPrice`; SELL fills when `marketPrice >= limitPrice`
- Fill LIMIT orders at the **market tick price** (not the limit price) — this models standard exchange price-improvement behaviour
- Persist each fill as an `Execution` record in PostgreSQL with an idempotency key to prevent double-fills
- Publish `OrderFilled` events to `executions.events.v1`
- Expose Prometheus metrics at `/metrics` and health probes at `/health/live` and `/health/ready`

## Architecture & Design Decisions

### Fill at market price, not limit price

When a limit order is triggered (market price crosses the limit), execution-service fills it at the current **market tick price**, which is at or better than the limit price from the trader's perspective. This matches the behaviour of exchange limit orders where the trader specifies the worst acceptable price and receives the best available price. For example, a BUY LIMIT at $150 triggered by a $148 tick fills at $148, saving the trader $2 per share.

### In-memory limit order queue

Queued limit orders are stored in process memory rather than a database. The rationale:

- A persistent queue would add a write and a read on every market tick for each queued order, creating O(n) database operations per tick at ~500 ms intervals
- The queue only needs to survive as long as the process is running — if the service restarts, unmatched limit orders still exist in ACCEPTED status in order-service and can be replayed from Kafka
- Keeping the queue in memory makes the matching loop synchronous and extremely fast

The `InMemoryLimitOrderQueue` stores orders as a `Map<symbol, LimitOrderEntry[]>` so that the tick consumer only scans orders relevant to the incoming symbol.

### Idempotency on fill persistence

Kafka at-least-once delivery means an `OrderAccepted` event may be delivered more than once (e.g., after a consumer restart without committed offsets). `ProcessOrderUseCase` calls `repo.findByIdempotencyKey(event.orderId)` before creating an execution. If a record already exists for that `orderId`, the event is acknowledged and skipped without publishing a duplicate fill. This makes the entire fill pipeline idempotent end-to-end.

### Kafka consumer groups

The service joins the consumer group `execution-service`. When multiple replicas run in parallel, Kafka distributes topic partitions between them. Because `orders.events.v1` partitions are keyed by `orderId`, all events for a given order are routed to the same partition and thus processed by the same replica. Combined with idempotency, this prevents double-fills even under concurrent execution.

### Per-service Prisma schema

Execution-service owns its own `prisma/schema.prisma` with a single `Execution` table. Independent migrations mean the execution schema can evolve (e.g., adding a `feeBps` column) without touching order-service or portfolio-service schemas.

### NoMarketPriceError

If an `OrderAccepted` event arrives for a symbol before any market tick has been received, `ProcessOrderUseCase` throws `NoMarketPriceError`. The error is caught by the Kafka consumer and the message is not acknowledged, leaving it available for retry once a tick arrives. This prevents stale fills at price zero.

### Fastify over Express

Consistent with platform-wide choice: ~2x throughput over Express in benchmarks, schema-based serialization, lower memory overhead.

### Graceful shutdown

On SIGTERM: readiness → NOT_READY, Kafka consumer stops polling, in-flight fills complete, hard exit after 25 seconds. Rolling deploys are zero-downtime because Kubernetes stops sending traffic as soon as the readiness probe returns 503.

## HTTP API

> This service exposes no order-submission or query endpoints. All user-facing access goes through the API Gateway → order-service path.

```
GET /health/live
GET /health/ready
GET /metrics        — Prometheus text format
GET /docs           — Swagger UI (internal)
```

## Kafka Topics

| Direction | Topic | Consumer group | Event types |
|---|---|---|---|
| Consumes | `orders.events.v1` | `execution-service` | `OrderAccepted` |
| Consumes | `market.ticks.v1` | `execution-service` | `MarketTickEvent` |
| Produces | `executions.events.v1` | — | `OrderFilled` |

### OrderFilled event shape

```typescript
{
  orderId: string;
  accountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  filledQuantity: number;
  fillPrice: number;
  filledAt: string;  // ISO 8601
}
```

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3014` | HTTP listen port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/executions` | PostgreSQL connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `execution-service` | Kafka client ID |
| `KAFKA_CONSUMER_GROUP` | `execution-service` | Consumer group ID |
| `SHUTDOWN_TIMEOUT_MS` | `25000` | Hard exit timeout after SIGTERM |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint |
| `NODE_ENV` | `development` | Environment name |

## Running Locally

### Standalone (pnpm)

```bash
# Apply database migrations
pnpm --filter @pulsedesk/execution-service exec prisma migrate deploy

# Start with hot-reload
pnpm --filter @pulsedesk/execution-service start:dev
```

The service starts on port 3014. Requires:
- PostgreSQL on port 5432
- Kafka on port 9092
- market-data-service producing to `market.ticks.v1` (so the price cache is populated before fills are attempted)
- order-service producing to `orders.events.v1`

### Via Docker Compose

```bash
docker compose up execution-service
```

## Running Tests

```bash
pnpm --filter @pulsedesk/execution-service test
pnpm --filter @pulsedesk/execution-service test:cov
```

The test suite covers:
- `ProcessOrderUseCase` — MARKET fill path, LIMIT queue path, idempotency skip
- `MatchLimitOrdersUseCase` — BUY condition (market ≤ limit), SELL condition (market ≥ limit), no-match path
- `InMemoryMarketPriceCache` — get/set behaviour
- `KafkaOrderEventConsumer` — message dispatch and idempotency integration
- `KafkaMarketTickConsumer` — price cache update and limit order matching trigger
- `KafkaFillEventPublisher` — message format and key
- `Execution.entity` — domain invariants

## Notable Implementation Details

- **Execution latency logging**: `ProcessOrderUseCase` logs `latencyMs` (time from start of fill logic to database save) on every successful fill. This is emitted as a structured Pino log field and captured by OTel → Loki for SLO tracking.
- **Publish-after-persist**: The fill event is published to Kafka only after `repo.save()` succeeds. If the Kafka publish fails, the error is logged but the execution record is NOT rolled back. This is an intentional at-least-once design: the downstream can always re-query the execution from the database, and a future retry of the Kafka publish (or a separate reconciliation job) can recover the event.
- **`InMemoryLimitOrderQueue` is not durable**: A service restart clears all queued LIMIT orders. In production, these would need to be replayed from the `orders.events.v1` Kafka topic on restart. For the current scope, this is accepted behaviour documented in the order-service README.
- **OTel auto-instrumentation**: Kafka producer and consumer calls are automatically traced via `@opentelemetry/auto-instrumentations-node`. Trace context is propagated in Kafka message headers, linking the order submission trace to the fill trace in Tempo.

## Dependencies

### Framework

| Package | Why |
|---------|-----|
| `@nestjs/common`, `@nestjs/core` | Structured DI framework. The two Kafka consumer handlers (order events, market tick events), the domain use cases, and the infrastructure adapters each live in isolated NestJS modules — independently testable without wiring up the full application. |
| `@nestjs/platform-fastify`, `fastify` | Fastify as the HTTP engine instead of Express. ~2x throughput in benchmarks, schema-based serialization, lower memory overhead. This service only exposes `/health` and `/metrics`, so throughput matters less here than elsewhere, but consistency with the platform avoids maintaining two HTTP adapter configurations. |
| `@nestjs/swagger` | Auto-generates the internal Swagger UI at `/docs` from decorators on the health and metrics controllers. |
| `reflect-metadata` | Enables TypeScript's `emitDecoratorMetadata` — required by every NestJS decorator. Must be the first import in the entry point. |
| `rxjs` | Required by NestJS internals. Not used directly in business code. |

### HTTP & Security

| Package | Why |
|---------|-----|
| `@fastify/cors` | CORS headers for cross-origin requests. Required even for an internal service when health endpoints are polled from a browser-based admin tool. |
| `@fastify/helmet` | HTTP security headers in one call (CSP, HSTS, X-Frame-Options, etc.). |
| `@fastify/static` | Serves the OpenAPI JSON file as a static asset for the Swagger UI. |

### Kafka

| Package | Why |
|---------|-----|
| `kafkajs` | Dual role: consumer of `orders.events.v1` and `market.ticks.v1`, producer of `executions.events.v1`. Pure JavaScript/TypeScript — no native binaries, so it builds and runs inside Docker without native dependency complications. Chosen over `node-rdkafka` (native librdkafka binding) because Docker cross-compilation of native modules is fragile and breaks on Apple Silicon / Linux ARM. Consumer group ID ensures that across multiple replicas each event is processed by exactly one replica via Kafka partition assignment. |

### Database

| Package | Why |
|---------|-----|
| `@prisma/client`, `prisma` | Type-safe ORM. The `Execution` entity maps directly to a Prisma model; `findByIdempotencyKey` is a generated, fully-typed query used to prevent double-fills when Kafka redelivers the same order event. Chosen over TypeORM because TypeORM's decorator-based approach has issues with strict TypeScript settings and a weaker migration story. Chosen over Sequelize because Prisma generates a typed client from the schema, eliminating a whole class of runtime type errors. |
| `@prisma/adapter-pg` | Connects Prisma to PostgreSQL using the `pg` driver via Prisma's driver adapter API, enabling connection pooling at the driver level rather than relying solely on Prisma's built-in connection manager. |
| `pg` | The `node-postgres` driver underlying `@prisma/adapter-pg`. Required as a peer dependency. |

### Internal

| Package | Why |
|---------|-----|
| `@pulsedesk/contracts` | Shared TypeScript types for `OrderAccepted`, `MarketTickEvent`, and `OrderFilled`. Producer and consumer agree on the exact event shape at compile time — schema drift between services is caught as a type error, not a runtime parse failure. |

### Observability

| Package | Why |
|---------|-----|
| `nestjs-pino`, `pino`, `pino-http` | Structured JSON logging. Pino serialises asynchronously with near-zero latency impact. `nestjs-pino` replaces the NestJS default logger; `pino-http` adds request/response log lines with timing. All logs go to stdout → Docker log driver → Loki. |
| `pino-pretty` | Pretty-prints Pino JSON in the terminal during local development. Disabled in production. |
| `@opentelemetry/auto-instrumentations-node` | Zero-code instrumentation — automatically traces Kafka producer/consumer calls and outbound HTTP without any `span.start()` in business code. Trace context is propagated in Kafka message headers, linking fill traces back to the originating order submission trace in Tempo. |
| `@opentelemetry/sdk-node` | Bootstraps the OTel trace/metric/log providers at process start. |
| `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/exporter-logs-otlp-http` | Send telemetry to the OTel Collector over OTLP/HTTP. Vendor-neutral protocol — backend can be swapped without code changes. |
| `@opentelemetry/sdk-logs`, `@opentelemetry/sdk-metrics` | Provider implementations for the log and metric pipelines alongside `sdk-node`. |

### Dev / build

| Package | Why |
|---------|-----|
| `@nestjs/cli`, `@nestjs/schematics` | NestJS build toolchain (`nest build`, `nest start --watch`). |
| `@nestjs/testing` | `Test.createTestingModule()` for isolated NestJS module contexts in unit tests. |
| `ts-jest` | TypeScript preprocessor for Jest with full type checking during tests — catches type errors Babel would silently strip. |
| `jest`, `@types/jest` | Test runner, standard in the NestJS ecosystem. |
| `@types/pg` | TypeScript types for `pg` driver — needed when writing typed queries outside Prisma or in test helpers. |
| `typescript` | TypeScript compiler, pinned at `~5.7.0` across the monorepo for consistency. |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting with TypeScript-aware rules. |
| `@types/node` | Node.js built-in type definitions. |
