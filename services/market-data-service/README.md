# market-data-service

Simulates a real-time market data feed for a configurable set of equity symbols and publishes price ticks to Kafka for consumption by the rest of the platform.

## Responsibilities

- Run an in-process tick simulator that generates bid/ask/last prices for each configured symbol every ~500 ms using a random-walk model (±0.2% per interval)
- Publish each normalised tick to the `market.ticks.v1` Kafka topic, keyed by symbol for partition affinity
- Maintain an in-memory snapshot of the latest tick per symbol
- Expose a `GET /watchlist` endpoint returning the full snapshot (or a filtered subset) for the API Gateway to proxy
- Accept external tick ingestion via `POST /ticks` (internal API key protected) for testing or integration with a real data feed
- Track tick throughput metrics via Prometheus (published at `/metrics`)
- Expose health probes at `/health/live` and `/health/ready`

## Architecture & Design Decisions

### Simulated feed with a random walk

Production market data feeds require licensed data sources that are not available in a development environment. The tick simulator approximates realistic price behaviour with a ±0.2% Gaussian-like walk per interval, seeded from realistic base prices (AAPL: $175, MSFT: $420, NVDA: $850, etc.). The spread is computed as 0.02% of mid-price. This is sufficient to exercise the full order-matching and P&L pipeline without any external dependency.

### Symbol-keyed Kafka partitioning

Each tick is published with the symbol as the Kafka message key. This ensures all ticks for a given symbol land on the same partition in order. Downstream consumers (execution-service, portfolio-service) can therefore maintain per-symbol state without cross-partition coordination.

### Fastify over Express

Fastify's schema-based request/response serialization and low-level HTTP overhead reduction deliver roughly 2x the throughput of Express in benchmarks. For a service that may serve hundreds of watchlist requests per second from the gateway cache-miss path, this headroom is worthwhile.

### NullTickPublisher for testing

The `NullTickPublisher` adapter implements the `ITickPublisher` port and silently discards messages. It is wired in unit tests so that the application logic can be exercised without a real Kafka broker.

### Internal API key guard

The `POST /ticks` endpoint for external ingestion is guarded by `InternalApiKeyGuard`, which checks the `x-api-key` request header against `INTERNAL_API_KEY`. This endpoint is not exposed through the API Gateway and is network-isolated in Docker Compose. The guard is a defence-in-depth measure.

### In-memory tick store

The latest price per symbol is kept in an `InMemoryTickStore` (a plain `Map`). This is intentional: market ticks are ephemeral and high-volume. Persisting every tick to a database would add latency and cost without benefit. The Kafka topic is the durable log; the in-memory store is simply the latest-value cache for the watchlist endpoint.

### Graceful shutdown

On SIGTERM the service marks readiness as NOT_READY and arms a 25-second hard-exit timer. The tick simulator's `OnModuleDestroy` hook clears the interval, ensuring no ticks are emitted after the shutdown signal. This prevents publishing to a Kafka broker that may already be closing.

## HTTP API

> All HTTP endpoints are internal-only — the service is not directly accessible from outside the Docker Compose network.

### Watchlist

```
GET /watchlist[?symbols=AAPL,MSFT]
Response 200: WatchlistResponseV1
{
  "quotes": [
    {
      "symbol": "AAPL",
      "bid": 174.8821,
      "ask": 174.9171,
      "last": 174.8996,
      "volume": 4312,
      "timestamp": "2026-03-23T10:42:01.234Z"
    },
    ...
  ]
}
```

The optional `symbols` query parameter is a comma-separated list of symbols to include. If omitted, all configured symbols are returned. The API Gateway calls this endpoint on cache misses and caches the result for 1 second in Valkey.

### Tick ingestion (testing / external feeds)

```
POST /ticks
Headers: x-api-key: <INTERNAL_API_KEY>
Body: { symbol, bid, ask, last, volume, timestamp }
Response 202: { "accepted": true }
```

Accepts a single tick, normalises it through `NormalizeTickUseCase`, stores it in the in-memory store, and publishes it to Kafka. Useful for driving the system from a test harness or a real data feed adapter.

### Infrastructure

```
GET /health/live      — liveness
GET /health/ready     — readiness
GET /metrics          — Prometheus text format
```

## Kafka Topics

| Direction | Topic | Key | Description |
|---|---|---|---|
| Produces | `market.ticks.v1` | `symbol` | One message per tick per symbol, ~500 ms cadence |

Consumed topics: none.

The message schema is defined in `@pulsedesk/contracts` (`MarketTickEvent`):

```typescript
{
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string; // ISO 8601
}
```

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3011` | HTTP listen port |
| `MARKET_DATA_SYMBOLS` | `AAPL,MSFT,GOOGL,TSLA,NVDA` | Comma-separated list of symbols to simulate |
| `MARKET_DATA_TICK_INTERVAL_MS` | `500` | Milliseconds between tick batches |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `market-data-service` | Kafka producer client ID |
| `INTERNAL_API_KEY` | — | API key for `POST /ticks`. If unset, the guard rejects all requests |
| `SHUTDOWN_TIMEOUT_MS` | `25000` | Hard exit timeout after SIGTERM |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint |
| `NODE_ENV` | `development` | Environment name |

## Running Locally

### Standalone (pnpm)

```bash
# From the monorepo root
pnpm --filter @pulsedesk/market-data-service start:dev
```

The service starts on port 3011 and begins emitting ticks immediately. Ensure a Kafka broker is reachable at `localhost:9092` (or set `KAFKA_BROKERS`).

To disable Kafka publishing during local development, either leave `KAFKA_BROKERS` unset or point it at a local Kafka instance started with `docker compose up kafka`.

### Via Docker Compose

```bash
docker compose up market-data-service
```

## Running Tests

```bash
# Unit tests
pnpm --filter @pulsedesk/market-data-service test

# With coverage
pnpm --filter @pulsedesk/market-data-service test:cov
```

The unit test suite covers the tick simulator, normalization pipeline, partition-key logic, in-memory tick store, Kafka publisher adapter, and the internal API key guard.

## Notable Implementation Details

- **Tick pipeline**: `TickSimulatorService` → `NormalizeTickUseCase` → `ProcessTickUseCase` → `ITickPublisher` (Kafka) + `ITickStore` (in-memory). Each layer is independently testable.
- **Partition key**: `partition-key.ts` computes a deterministic Kafka partition key from the symbol string, ensuring symbol-level ordering guarantees across topic partitions.
- **Metrics**: `TickMetricsService` increments Prometheus counters for ticks published and ingestion errors. These are scraped by Prometheus and visible in Grafana.
- **OTel**: `instrumentation.ts` pre-loads the OpenTelemetry Node SDK via `--require`, capturing all module bootstrap spans and auto-instrumented Kafka producer traces.

## Dependencies

### Framework

| Package | Why |
|---------|-----|
| `@nestjs/common`, `@nestjs/core` | Structured DI framework. Even though this service has no auth or database, NestJS modules cleanly separate the tick simulator, Kafka producer, HTTP layer, and metrics service — each independently testable via `@nestjs/testing`. |
| `@nestjs/platform-fastify`, `fastify` | Fastify as the HTTP engine instead of Express. ~2x throughput in benchmarks, schema-based serialization, lower per-request overhead. The watchlist endpoint may be hit at high frequency from the API Gateway on cache misses. |
| `@nestjs/swagger` | Auto-generates internal Swagger docs at `/docs` from controller decorators. |
| `reflect-metadata` | Enables TypeScript's `emitDecoratorMetadata` — required by every NestJS decorator. Must be the first import in the entry point. |
| `rxjs` | Required by NestJS internals. Not used directly in business code. |

### HTTP & Security

| Package | Why |
|---------|-----|
| `@fastify/cors` | CORS headers for cross-origin requests from browser-based tooling or admin UIs. |
| `@fastify/helmet` | HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) in a single call. |
| `@fastify/static` | Serves the OpenAPI JSON file as a static asset for the Swagger UI. |

### Kafka

| Package | Why |
|---------|-----|
| `kafkajs` | Kafka producer that publishes tick events to `market.ticks.v1`. Pure JavaScript/TypeScript with no native binaries — builds cleanly inside Docker without native dependency complications. Chosen over `node-rdkafka` (native librdkafka binding) because Docker cross-compilation of native modules is fragile and breaks on Apple Silicon / Linux ARM. The `NullTickPublisher` adapter makes the dependency entirely swappable in tests without a real broker. |

### Internal

| Package | Why |
|---------|-----|
| `@pulsedesk/contracts` | The `MarketTickEvent` type lives here. Both this service (producer) and execution-service, portfolio-service, and notification-service (consumers) import from contracts — one source of truth for the event schema. Drift in the tick shape is caught at compile time, not at runtime. |

### Observability

| Package | Why |
|---------|-----|
| `nestjs-pino`, `pino`, `pino-http` | Structured JSON logging. Pino serialises asynchronously with near-zero latency impact. `nestjs-pino` replaces the NestJS default logger; `pino-http` adds request/response log lines with timing. Logs go to stdout → Docker log driver → Loki. |
| `@opentelemetry/auto-instrumentations-node` | Zero-code instrumentation — automatically traces Kafka producer calls without any `span.start()` in business code. |
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
| `pino-pretty` | Pretty-prints Pino JSON in the terminal during local development. Disabled in production. |
| `typescript` | TypeScript compiler, pinned at `~5.7.0` across the monorepo for consistency. |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting with TypeScript-aware rules. |
| `@types/node` | Node.js built-in type definitions. |
