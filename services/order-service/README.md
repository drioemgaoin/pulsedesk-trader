# order-service

Manages the full lifecycle of trading orders — from submission and risk validation through to fill acknowledgement — persisting every state transition to PostgreSQL and broadcasting events over Kafka.

## Responsibilities

- Accept order submission commands (`POST /v1/orders`) with client-supplied idempotency keys (`commandId`)
- Create the order in PENDING status in PostgreSQL via Prisma
- Synchronously call risk-service to APPROVE or REJECT the order, with a circuit breaker protecting against downstream unavailability
- Transition accepted orders to ACCEPTED and rejected orders to REJECTED, persisting the rejection reason
- Publish `OrderAccepted` or `OrderRejected` events to the `orders.events.v1` Kafka topic
- Consume `OrderFilled` events from `executions.events.v1` and transition the matching order to FILLED
- Expose paginated order history via `GET /v1/orders` with multi-field filtering (status, pagination)
- Expose Swagger at `/docs`, Prometheus metrics at `/metrics`, health probes at `/health/live` and `/health/ready`

## Architecture & Design Decisions

### Per-service Prisma schema

Order-service owns its own `prisma/schema.prisma` and runs its own migrations independently of other services. This means schema changes in the portfolio-service or execution-service can be deployed without coordinating with the order-service schema. There is no shared Prisma client or shared database model across services — each service is fully autonomous at the persistence layer.

### Idempotency via commandId

Kafka delivery is at-least-once; network retries from clients can also cause duplicate POST requests. The `commandId` (UUID v4, client-generated) is stored as a unique key. If `SubmitOrderUseCase` finds an existing order with the same `commandId`, it returns the existing order without creating a duplicate. This makes `POST /v1/orders` safe to retry unconditionally.

### Synchronous risk check with circuit breaker

The risk check is intentionally synchronous: the order-service makes an HTTP call to risk-service inside the submit flow and uses the result to immediately set the order status before returning a response to the caller. This gives the client a definitive ACCEPTED or REJECTED status in the same request.

The risk-service HTTP client is wrapped in a circuit breaker (`risk-http.client.ts`). When the risk-service is slow or unavailable, the breaker opens after a configurable error threshold and fast-fails subsequent calls, preventing the order-service thread pool from stacking up timed-out connections.

### Kafka consumer group for fill events

The service consumes `executions.events.v1` in a named consumer group (`order-service`). When multiple order-service replicas run in parallel, Kafka assigns partitions between them so each fill event is processed by exactly one replica. Combined with idempotency checks in `ProcessFillNotificationUseCase`, double-fill transitions are prevented even if a message is delivered twice.

### Fastify over Express

Fastify's schema-based serialization and lower HTTP overhead are chosen over Express for the same reason as all other services in this monorepo: benchmark-proven ~2x throughput advantage, which matters at the edge of the request path.

### Graceful shutdown

On SIGTERM the service marks the readiness probe as NOT_READY and waits up to 25 seconds before forcing `process.exit(1)`. During this window, NestJS flushes in-flight HTTP requests and the Kafka consumer commits its current offset before disconnecting. This enables zero-downtime rolling deploys.

## HTTP API

> All routes are internal-only (not directly accessible outside Docker Compose). The API Gateway enforces JWT authentication before proxying here.

### Submit order

```
POST /v1/orders
Body:
{
  "commandId": "550e8400-e29b-41d4-a716-446655440000",  // UUID v4, client-generated idempotency key
  "accountId": "acc-001",
  "symbol": "AAPL",
  "side": "BUY",          // BUY | SELL
  "type": "MARKET",       // MARKET | LIMIT
  "quantity": 10,
  "limitPrice": 150.50    // required for LIMIT orders, omit for MARKET
}
Response 201: OrderResponseDto
```

### Get order by ID

```
GET /v1/orders/:id
Response 200: OrderResponseDto
Response 404: when order does not exist
```

### List orders

```
GET /v1/orders?accountId=acc-001[&status=PENDING,FILLED][&limit=50][&offset=0]
Response 200:
{
  "orders": [ ...OrderResponseDto ],
  "pagination": { "limit": 50, "offset": 0, "total": 123 }
}
```

`status` accepts a comma-separated list from: `PENDING`, `ACCEPTED`, `REJECTED`, `FILLED`. `limit` is capped at 200, default 50. `offset` defaults to 0.

### Cancel order

```
POST /v1/orders/:id/cancel
Response 200: OrderResponseDto (with status CANCELLED)
```

### OrderResponseDto shape

```typescript
{
  id: string;
  commandId: string;
  accountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  limitPrice: number | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "FILLED" | "CANCELLED";
  rejectionReason: string | null;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}
```

### Infrastructure

```
GET /health/live
GET /health/ready
GET /metrics
GET /docs          — Swagger UI
```

## Kafka Topics

| Direction | Topic | Key | Event types |
|---|---|---|---|
| Produces | `orders.events.v1` | `orderId` | `OrderAccepted`, `OrderRejected` |
| Consumes | `executions.events.v1` | — | `OrderFilled` |

On receiving an `OrderFilled` event, `ProcessFillNotificationUseCase` looks up the order by `orderId` and transitions it to FILLED. The transition is idempotent: if the order is already FILLED, the event is acknowledged and discarded.

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3012` | HTTP listen port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/orders` | PostgreSQL connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `order-service` | Kafka client ID |
| `KAFKA_CONSUMER_GROUP` | `order-service` | Consumer group for executions.events.v1 |
| `RISK_SERVICE_URL` | `http://localhost:3013` | Base URL of risk-service |
| `INTERNAL_API_KEY` | — | Expected value of `x-api-key` header on all inbound routes |
| `SHUTDOWN_TIMEOUT_MS` | `25000` | Hard exit timeout after SIGTERM |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint |
| `NODE_ENV` | `development` | Environment name |

## Running Locally

### Standalone (pnpm)

```bash
# Apply database migrations first
pnpm --filter @pulsedesk/order-service exec prisma migrate deploy

# Start with hot-reload
pnpm --filter @pulsedesk/order-service start:dev
```

The service starts on port 3012. Requires PostgreSQL on port 5432, Kafka on port 9092, and risk-service on port 3013 (or the circuit breaker will open after the first timeout).

### Via Docker Compose

```bash
docker compose up order-service
```

Migrations are run automatically as part of the Docker entrypoint.

## Running Tests

```bash
pnpm --filter @pulsedesk/order-service test
pnpm --filter @pulsedesk/order-service test:cov
```

The test suite covers domain entities (order state machine), all use-cases (submit, get, get-list, process-fill), the Kafka publisher and consumer adapters, the risk HTTP client, and controller-level contract tests.

## Notable Implementation Details

- **Order state machine**: `Order.entity.ts` enforces valid transitions. Calling `accept()` on a REJECTED order throws `OrderValidationError`, preventing illegal state mutations at the domain layer regardless of which infrastructure adapter is driving the change.
- **Risk client**: `RiskHttpClient` uses `@nestjs/axios` with a configured timeout and wraps calls in a circuit breaker. The breaker state is logged on transitions (OPEN/HALF-OPEN/CLOSED) for observability.
- **Contract tests**: `order-status.contract.spec.ts` asserts that the HTTP response shape matches the `@pulsedesk/contracts` package definition. This catches drift between what the service emits and what consumers expect before it reaches integration tests.
- **InternalApiKeyGuard**: All routes require `x-api-key` matching `INTERNAL_API_KEY`. The API Gateway sets this header when proxying requests. The guard ensures that only authorised internal callers can reach the service even if the Docker network isolation changes.

## Dependencies

### Framework

| Package | Why |
|---------|-----|
| `@nestjs/common`, `@nestjs/core` | Structured DI framework. This is the most orchestration-heavy service — HTTP reception, outbound HTTP risk check, Kafka publish, Kafka consume, and database — and NestJS modules keep each concern isolated and independently testable. |
| `@nestjs/platform-fastify`, `fastify` | Fastify as the HTTP engine instead of Express. ~2x throughput in benchmarks; schema-based serialization; consistent with the rest of the platform. |
| `@nestjs/mapped-types` | Provides `PartialType`, `OmitType`, `PickType` for deriving query filter DTOs from base order DTOs without duplicating field definitions. Used for the order list query params DTO. |
| `@nestjs/swagger` | Auto-generates Swagger UI at `/docs` from controller and DTO decorators. |
| `reflect-metadata` | Enables TypeScript's `emitDecoratorMetadata` — required by every NestJS decorator. Must be the first import in the entry point. |
| `rxjs` | Required by NestJS internals. Not used directly in business code. |

### HTTP & Security

| Package | Why |
|---------|-----|
| `@fastify/cors` | CORS headers for cross-origin access to health and metrics endpoints. |
| `@fastify/helmet` | HTTP security headers in a single call (CSP, HSTS, X-Frame-Options, etc.). |
| `@fastify/static` | Serves the OpenAPI JSON file as a static asset for the Swagger UI. |

### Validation

| Package | Why |
|---------|-----|
| `class-validator`, `class-transformer` | Declarative DTO validation via decorators. Works natively with NestJS's `ValidationPipe` — incoming JSON is validated and deserialized in one pipeline step. Eliminates manual field checks in controller code. |

### Resilience

| Package | Why |
|---------|-----|
| `opossum` | Circuit breaker for the synchronous risk-service HTTP call. When risk-service is slow or unavailable, the breaker opens and fast-fails subsequent calls, preventing the order-service from stacking timed-out connections. Chosen over `cockatiel` for its maturity and Prometheus metric integration. |

### Kafka

| Package | Why |
|---------|-----|
| `kafkajs` | Dual role: producer of `orders.events.v1` (`OrderAccepted`/`OrderRejected`) and consumer of `executions.events.v1` (`OrderFilled`). Pure JavaScript/TypeScript — no native binaries, builds cleanly in Docker without native dependency complications. Chosen over `node-rdkafka` for portability. Consumer group ensures that across multiple replicas each fill event is processed by exactly one replica. |

### Database

| Package | Why |
|---------|-----|
| `@prisma/client`, `prisma` | Type-safe ORM. Generates a fully-typed client from the schema — no raw SQL strings, no risk of SQL injection. `prisma migrate` handles schema evolution with version control. Chosen over TypeORM because TypeORM has issues with strict TypeScript settings and a weaker migration story. Chosen over Sequelize because Prisma's generated client eliminates runtime type errors. |
| `@prisma/adapter-pg` | Connects Prisma to PostgreSQL via the `pg` driver using Prisma's driver adapter API, enabling connection pooling at the driver level. |
| `pg` | The `node-postgres` driver underlying `@prisma/adapter-pg`. Required as a peer dependency. |
| `dotenv` | Loads `.env` into `process.env` at startup. Used directly rather than NestJS's `ConfigModule` to keep bootstrap simple — the environment variables are straightforward (DB URL, Kafka brokers, risk service URL, internal API key). |

### Internal

| Package | Why |
|---------|-----|
| `@pulsedesk/contracts` | Shared TypeScript types for `OrderAccepted`, `OrderRejected`, `OrderFilled`, and `OrderResponseDto`. Contract tests assert the HTTP response shape matches this package — drift is caught at compile time and in CI, not at runtime. |

### Observability

| Package | Why |
|---------|-----|
| `nestjs-pino`, `pino`, `pino-http` | Structured JSON logging. Pino serialises asynchronously with near-zero latency impact. `nestjs-pino` replaces the NestJS default logger; `pino-http` adds request/response log lines. Logs flow to stdout → Docker log driver → Loki. |
| `pino-pretty` | Pretty-prints Pino JSON in the terminal during local development. Disabled in production. |
| `@opentelemetry/auto-instrumentations-node` | Zero-code instrumentation — automatically traces HTTP requests, outbound Axios risk-check calls, Kafka publish/consume, and Prisma queries without `span.start()` in business code. |
| `@opentelemetry/sdk-node` | Bootstraps OTel providers at process start. |
| `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/exporter-logs-otlp-http` | OTLP/HTTP export to the OTel Collector. Vendor-neutral — backend can change without code changes. |
| `@opentelemetry/sdk-logs`, `@opentelemetry/sdk-metrics` | Provider implementations for log and metric pipelines alongside `sdk-node`. |

### Dev / build

| Package | Why |
|---------|-----|
| `@nestjs/cli`, `@nestjs/schematics` | NestJS build toolchain (`nest build`, `nest start --watch`). `prebuild` runs `prisma generate` to regenerate the typed client before each build. |
| `@nestjs/testing` | `Test.createTestingModule()` for isolated NestJS module contexts in unit tests. |
| `ts-jest` | TypeScript preprocessor for Jest with full type checking — catches type errors Babel would silently strip. |
| `jest`, `@types/jest` | Test runner, standard in the NestJS ecosystem. |
| `@types/opossum` | TypeScript type definitions for the `opossum` circuit breaker. |
| `@types/pg` | TypeScript types for the `pg` driver — needed in typed test helpers. |
| `typescript` | TypeScript compiler, pinned at `~5.7.0` across the monorepo for consistency. |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting with TypeScript-aware rules. |
| `@types/node` | Node.js built-in type definitions. |
