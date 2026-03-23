# portfolio-service

Maintains per-account positions and calculates real-time unrealised P&L by consuming trade fills and market tick events from Kafka, persisting positions to PostgreSQL.

## Responsibilities

- Consume `OrderFilled` events from `executions.events.v1` and update the corresponding position for the account and symbol
- When a BUY fill arrives, increase quantity and recalculate the weighted average cost basis
- When a SELL fill arrives, reduce quantity; if quantity reaches zero, set average cost to zero
- Consume `market.ticks.v1` events and update the in-memory market price cache for each symbol
- Respond to `GET /v1/positions/:accountId` with the current positions for that account, each enriched with a real-time unrealised P&L value calculated from the latest cached market price
- Publish position update events to `portfolio.events.v1` after each fill
- Expose Prometheus metrics at `/metrics` and health probes at `/health/live` and `/health/ready`

## Architecture & Design Decisions

### Average cost basis tracking

The `Position` domain entity tracks `quantity` and `averageCost` (volume-weighted average purchase price). For BUY fills:

```
newAvgCost = (currentQty × currentAvgCost + fillQty × fillPrice) / newQty
```

For SELL fills, the average cost is preserved if quantity remains above zero (the remaining long position retains its cost basis). This is the standard FIFO-equivalent accounting for a position in a single asset class.

### Unrealised P&L calculation at query time

P&L is not stored in PostgreSQL. Instead, `GetPositionsQuery` fetches the positions from the database, then applies:

```
unrealizedPnl = (marketPrice - averageCost) × quantity
```

...using the market price from the in-memory cache. Calculating P&L at query time rather than persisting it avoids a database write on every market tick for every held position, which would be O(positions × ticks/sec) writes — potentially thousands per second. The in-memory cache is updated on each tick consumer event at negligible cost.

### In-memory market price cache

Market ticks arrive at ~500 ms intervals per symbol. Storing them in PostgreSQL would be prohibitively noisy. `InMemoryMarketPriceCache` holds the latest price per symbol in a `Map`. This cache is populated as soon as the first tick for a symbol arrives. If `GetPositionsQuery` is called before any tick for a symbol has arrived, `unrealizedPnl` is `null` for that position rather than an incorrect zero-based value.

### Per-service Prisma schema

Portfolio-service owns its own `prisma/schema.prisma` with a `Position` table. Independent migrations allow the portfolio schema to add fields (e.g., realised P&L, currency) without requiring coordinated deployments with order-service or execution-service.

### Kafka consumer groups

The service joins the consumer group `portfolio-service`. Multiple replicas share the partition load without double-processing fills. Fills for the same account may arrive on different partitions (not keyed by account in the current implementation), so idempotency is enforced at the database level via upsert semantics in `PrismaPositionRepository`.

### Graceful shutdown

On SIGTERM: readiness → NOT_READY, Kafka consumers stop polling, in-flight position updates complete, hard exit after 25 seconds. This prevents corrupt partial position updates during rolling deploys.

### Fastify over Express

Consistent with the platform-wide choice: ~2x throughput in benchmarks, schema-based serialization, lower overhead per request.

## HTTP API

> Accessible only from within the internal Docker Compose network. The API Gateway proxies authenticated requests here, deriving the `accountId` from the JWT subject.

### Get positions

```
GET /v1/positions/:accountId
Response 200: PositionsResponseV1
{
  "accountId": "acc-001",
  "positions": [
    {
      "id": "...",
      "symbol": "AAPL",
      "quantity": 25,
      "averageCost": 172.45,
      "unrealizedPnl": 62.75,    // null if no market price is cached yet
      "marketPrice": 174.96,     // null if no market price is cached yet
      "updatedAt": "2026-03-23T10:42:01.234Z"
    }
  ]
}
```

Positions with `quantity === 0` are included in the response (the account had a position that was fully sold). Callers may filter these client-side.

### Infrastructure

```
GET /health/live
GET /health/ready
GET /metrics        — Prometheus text format
GET /docs           — Swagger UI (internal)
```

## Kafka Topics

| Direction | Topic | Consumer group | Event types |
|---|---|---|---|
| Consumes | `executions.events.v1` | `portfolio-service` | `OrderFilled` |
| Consumes | `market.ticks.v1` | `portfolio-service` | `MarketTickEvent` |
| Produces | `portfolio.events.v1` | — | `PortfolioUpdated` |

### PortfolioUpdated event shape

```typescript
{
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  timestamp: string;  // ISO 8601
}
```

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3015` | HTTP listen port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/portfolio` | PostgreSQL connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `portfolio-service` | Kafka client ID |
| `KAFKA_CONSUMER_GROUP` | `portfolio-service` | Consumer group ID |
| `SHUTDOWN_TIMEOUT_MS` | `25000` | Hard exit timeout after SIGTERM |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint |
| `NODE_ENV` | `development` | Environment name |

## Running Locally

### Standalone (pnpm)

```bash
# Apply database migrations
pnpm --filter @pulsedesk/portfolio-service exec prisma migrate deploy

# Start with hot-reload
pnpm --filter @pulsedesk/portfolio-service start:dev
```

The service starts on port 3015. Requires PostgreSQL on port 5432 and Kafka on port 9092. Market ticks and fill events are consumed as soon as market-data-service and execution-service are running.

### Via Docker Compose

```bash
docker compose up portfolio-service
```

## Running Tests

```bash
pnpm --filter @pulsedesk/portfolio-service test
pnpm --filter @pulsedesk/portfolio-service test:cov
```

The test suite covers:
- `Position.entity` — `open()`, `applyFill()` (BUY/SELL), `unrealizedPnl()`, boundary conditions
- `ProcessFillUseCase` — new position creation, existing position update, idempotency
- `GetPositionsQuery` — P&L enrichment with cached price, null P&L when price is absent
- `KafkaFillEventConsumer` — message dispatch to use case
- `KafkaMarketTickConsumer` — price cache update
- `PrismaPositionRepository` integration spec — upsert behaviour against a real database

## Notable Implementation Details

- **Integration test**: `prisma-position.repository.integration.spec.ts` runs against a real PostgreSQL instance (configured via `DATABASE_URL` in the test environment). It validates the upsert logic that prevents duplicate position rows for the same `(accountId, symbol)` pair. Run with `pnpm test` when the database is available; the spec is tagged so it can be skipped in pure unit-test runs.
- **Immutable Position entity**: `Position` is immutable — all mutations return a new `Position` instance. `applyFill()` and `open()` return new objects rather than modifying fields in place. This makes the domain logic easy to test and reason about without mocking.
- **Contract test**: `positions.contract.spec.ts` asserts that the `GET /v1/positions/:accountId` response shape matches the `PositionsResponseV1` type from `@pulsedesk/contracts`. This prevents silent breaking changes to the API shape.
- **OTel traces**: Kafka consumer calls and Prisma queries are auto-instrumented. A single `OrderFilled` event produces a trace spanning the consumer → use case → repository → Kafka producer chain, visible in Grafana Tempo.

## Dependencies

### Framework

| Package | Why |
|---------|-----|
| `@nestjs/common`, `@nestjs/core` | Structured DI framework. Two independent Kafka consumers (fill events and tick events) coexist in the same process — NestJS modules make this composable without tight coupling between the position update logic and the price cache update logic. |
| `@nestjs/platform-fastify`, `fastify` | Fastify as the HTTP engine instead of Express. ~2x throughput in benchmarks, schema-based serialization, consistent with the rest of the platform. |
| `@nestjs/swagger` | Auto-generates internal Swagger docs at `/docs`. |
| `reflect-metadata` | Enables TypeScript's `emitDecoratorMetadata` — required by every NestJS decorator. Must be the first import in the entry point. |
| `rxjs` | Required by NestJS internals. Not used directly in business code. |

### HTTP & Security

| Package | Why |
|---------|-----|
| `@fastify/cors` | CORS headers for cross-origin access to health and metrics endpoints. |
| `@fastify/helmet` | HTTP security headers in a single call (CSP, HSTS, X-Frame-Options, etc.). |
| `@fastify/static` | Serves the OpenAPI JSON file as a static asset for the Swagger UI. |

### Kafka

| Package | Why |
|---------|-----|
| `kafkajs` | Dual consumer (`executions.events.v1` for fills, `market.ticks.v1` for price updates) and producer (`portfolio.events.v1` for position change notifications). Pure JavaScript/TypeScript — no native binaries, builds cleanly in Docker without native dependency complications. Chosen over `node-rdkafka` for portability. Consumer group ensures multiple replicas share partition load without double-processing fills. |

### Database

| Package | Why |
|---------|-----|
| `@prisma/client`, `prisma` | Type-safe ORM. The `Position` entity maps directly to a Prisma model; upsert semantics in `PrismaPositionRepository` enforce the unique `(accountId, symbol)` constraint at the database level. Chosen over TypeORM for its strict TypeScript compatibility and reliable migration story. Chosen over Sequelize because Prisma's generated client eliminates a whole class of runtime type errors. P&L is deliberately NOT stored — positions store only cost basis (`avgCost`, `qty`) and P&L is computed at query time from the in-memory price cache, avoiding O(positions × ticks/sec) write amplification. |
| `@prisma/adapter-pg` | Connects Prisma to PostgreSQL via the `pg` driver using Prisma's driver adapter API, enabling connection pooling at the driver level. |
| `pg` | The `node-postgres` driver underlying `@prisma/adapter-pg`. Required as a peer dependency. |

### Internal

| Package | Why |
|---------|-----|
| `@pulsedesk/contracts` | Shared TypeScript types for `OrderFilled`, `MarketTickEvent`, and `PositionsResponseV1`. Contract tests assert the HTTP response shape matches this package — drift between what this service emits and what the API Gateway or frontend expects is caught at compile time. |

### Observability

| Package | Why |
|---------|-----|
| `nestjs-pino`, `pino`, `pino-http` | Structured JSON logging. Pino serialises asynchronously with near-zero latency impact on the Kafka message processing loop. Logs flow to stdout → Docker log driver → Loki. |
| `pino-pretty` | Pretty-prints Pino JSON in the terminal during local development. Disabled in production. |
| `@opentelemetry/auto-instrumentations-node` | Zero-code instrumentation — automatically traces Kafka consumer/producer calls and Prisma queries. A single `OrderFilled` event produces a trace spanning consumer → use case → repository → Kafka producer, visible in Grafana Tempo. |
| `@opentelemetry/sdk-node` | Bootstraps OTel providers at process start. |
| `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/exporter-logs-otlp-http` | OTLP/HTTP export to the OTel Collector. Vendor-neutral — backend can change without code changes. |
| `@opentelemetry/sdk-logs`, `@opentelemetry/sdk-metrics` | Provider implementations for log and metric pipelines alongside `sdk-node`. |

### Dev / build

| Package | Why |
|---------|-----|
| `@nestjs/cli`, `@nestjs/schematics` | NestJS build toolchain (`nest build`, `nest start --watch`). `prebuild` and `pretest` run `prisma generate` to regenerate the typed client before each build or test run. |
| `@nestjs/testing` | `Test.createTestingModule()` for isolated NestJS module contexts in unit tests. |
| `ts-jest` | TypeScript preprocessor for Jest with full type checking — catches type errors Babel would silently strip. |
| `jest`, `@types/jest` | Test runner, standard in the NestJS ecosystem. |
| `@types/pg` | TypeScript types for the `pg` driver — needed in the integration test that runs against a real PostgreSQL instance. |
| `typescript` | TypeScript compiler, pinned at `~5.7.0` across the monorepo for consistency. |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting with TypeScript-aware rules. |
| `@types/node` | Node.js built-in type definitions. |
