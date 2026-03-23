# risk-service

A stateless HTTP validator that evaluates whether an order should be approved or rejected based on configured risk limits, and emits Prometheus metrics for every decision.

## Responsibilities

- Accept `POST /v1/risk/evaluate` requests from order-service with order parameters
- Check the order's quantity against `RISK_MAX_QUANTITY` (default: 1000)
- Check the order's notional value (quantity × limitPrice, or quantity × a proxy price for MARKET orders) against `RISK_MAX_NOTIONAL` (default: 100 000)
- Return an `APPROVED` or `REJECTED` decision with a machine-readable `reasonCode` and human-readable `reasons` array
- Record Prometheus counters for approved/rejected decisions, exposed at `/metrics`
- Expose health probes at `/health/live` and `/health/ready`

## Architecture & Design Decisions

### Stateless by design

Risk-service holds no database and produces no Kafka messages. Every evaluation is computed entirely from the request payload and the environment-configured limits. This means:

- The service can scale horizontally without any coordination — there is no shared state to synchronise
- Restart is instantaneous — there is no warm-up phase
- Integration tests are trivially fast — no database or broker to spin up

The trade-off is that this service cannot enforce account-level aggregate limits (e.g., total open notional across all orders for an account). That capability can be added by introducing a read-model backed by PostgreSQL, but for the current scope the per-order limits are sufficient.

### Internal API key guard

`InternalApiKeyGuard` checks the `x-api-key` header against `INTERNAL_API_KEY`. The risk-service is not exposed outside the Docker Compose internal network, but the guard provides defence-in-depth: if network isolation is accidentally relaxed, a caller still needs the shared secret to reach the evaluation endpoint.

### Why order-service calls risk synchronously (not via Kafka)

Asynchronous risk validation would require order-service to hold the HTTP response open (long-poll) or shift the client to a polling model, adding latency and complexity. Since risk decisions are fast and stateless, a synchronous HTTP call with a circuit breaker on the caller side is simpler and gives the client an immediate ACCEPTED/REJECTED response in the same request.

### Prometheus metrics over OTel histograms

The `RiskMetricsService` uses the `prom-client` library to emit counters directly in Prometheus format. These are scraped via `/metrics` by the Prometheus server in the observability stack and visualised in Grafana alongside the OTel traces and logs produced by other services.

### Fastify over Express

Consistent with the rest of the platform: benchmark-proven ~2x throughput advantage, schema-based response serialization, and a smaller runtime footprint.

### Graceful shutdown

On SIGTERM the service marks readiness NOT_READY and arms a 25-second hard exit. Since the service is stateless, shutdown is near-instantaneous, but the graceful window allows any in-flight risk evaluations to complete and return a response before the process exits.

## HTTP API

> Accessible only from within the internal Docker Compose network. Requires `x-api-key` header.

### Evaluate risk

```
POST /v1/risk/evaluate
Headers: x-api-key: <INTERNAL_API_KEY>
Body:
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",   // UUID — for logging/tracing only
  "commandId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", // idempotency key — same commandId always returns same decision
  "symbol": "AAPL",
  "quantity": 10,
  "limitPrice": 150.50   // optional (null for MARKET orders)
}
Response 200:
{
  "outcome": "APPROVED",          // APPROVED | REJECTED
  "reasonCode": "APPROVED",       // machine-readable code
  "reasons": []                   // human-readable rejection messages (empty on approval)
}
```

On rejection, `reasonCode` will be one of the values from `RiskReasonCodeEnum` (e.g., `QUANTITY_EXCEEDED`, `NOTIONAL_EXCEEDED`), and `reasons` will contain a description such as `"quantity 1500 exceeds maximum allowed 1000"`.

### Infrastructure

```
GET /health/live
GET /health/ready
GET /metrics        — Prometheus text format (decision counters, label: outcome)
```

## Kafka Topics

This service does not produce or consume any Kafka topics.

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3013` | HTTP listen port |
| `RISK_MAX_QUANTITY` | `1000` | Maximum order quantity allowed |
| `RISK_MAX_NOTIONAL` | `100000` | Maximum notional value (quantity × price) allowed |
| `INTERNAL_API_KEY` | — | Required `x-api-key` value for all inbound routes |
| `SHUTDOWN_TIMEOUT_MS` | `25000` | Hard exit timeout after SIGTERM |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint |
| `NODE_ENV` | `development` | Environment name |

## Running Locally

### Standalone (pnpm)

```bash
pnpm --filter @pulsedesk/risk-service start:dev
```

The service starts on port 3013. No external dependencies are required — it is fully self-contained.

To test the limits, set environment variables before starting:

```bash
RISK_MAX_QUANTITY=500 RISK_MAX_NOTIONAL=50000 pnpm --filter @pulsedesk/risk-service start:dev
```

### Via Docker Compose

```bash
docker compose up risk-service
```

## Running Tests

```bash
pnpm --filter @pulsedesk/risk-service test
pnpm --filter @pulsedesk/risk-service test:cov
```

The test suite covers the domain risk decision logic, the `EvaluateRiskUseCase`, the `RiskMetricsService`, the controller, and the `InternalApiKeyGuard`. Because the service is stateless and has no infrastructure dependencies, all tests are pure unit tests with no mocking of databases or brokers.

## Notable Implementation Details

- **Domain objects**: `RiskDecision` is a value object that encapsulates the evaluation result. `risk-limits.ts` reads limits from environment variables at startup. Both are tested in isolation from the HTTP layer.
- **Idempotency note**: The service does not cache previous decisions. The `commandId` in the request body is passed through to logs and traces for correlation, but the service always re-evaluates the limits from the current environment configuration. If limits change between a retry and the original call, the result may differ — this is intentional and expected for a stateless validator.
- **Metrics label**: Prometheus counters use an `outcome` label (`approved` / `rejected`), making it easy to build Grafana alerts on rejection rate spikes that may indicate misconfigured limits or unusual order patterns.
- **No Swagger on the gateway path**: The risk-service Swagger (`/docs`) documents the internal API. It is not proxied through the API Gateway and should not be exposed publicly.

## Dependencies

### Framework

| Package | Why |
|---------|-----|
| `@nestjs/common`, `@nestjs/core` | Structured DI framework. Even for a stateless service the controller/service split keeps HTTP concerns separate from the evaluation business logic, making the `EvaluateRiskUseCase` and `RiskDecision` value object unit-testable in complete isolation from HTTP. |
| `@nestjs/platform-fastify`, `fastify` | Fastify as the HTTP engine instead of Express. ~2x throughput in benchmarks; consistent with the rest of the platform. Risk checks are in the synchronous critical path of every order submission, so latency matters. |
| `@nestjs/swagger` | Auto-generates internal Swagger docs at `/docs` from controller and DTO decorators. |
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
| `class-validator`, `class-transformer` | Strict validation of the incoming `RiskCheckRequestDto` before any evaluation runs. A malformed request (missing price, negative quantity) is rejected by `ValidationPipe` before it reaches the business logic — the evaluator never sees invalid input. |

### Observability (metrics)

| Package | Why |
|---------|-----|
| `prom-client` | Prometheus metrics client. Exposes a counter for `APPROVED` vs `REJECTED` decisions with `symbol` and `reasonCode` labels. This service uses `prom-client` directly (rather than relying solely on OTel auto-instrumentation) because the risk decision counters are custom business metrics — not HTTP or system metrics — and need to be scraped in Prometheus text format at `/metrics`. Other services get their HTTP metrics via OTel; this one needs the explicit counter. |
| `nestjs-pino`, `pino`, `pino-http` | Structured JSON logging. Every APPROVED and REJECTED decision is logged with the symbol and reason for audit tracing. Pino's async serialisation has near-zero latency impact on the synchronous request path. |
| `pino-pretty` | Pretty-prints Pino JSON in the terminal during local development. Disabled in production. |
| `@opentelemetry/auto-instrumentations-node` | Zero-code instrumentation — automatically traces incoming HTTP requests. Valuable to measure risk check latency from order-service's perspective even though the service is stateless. |
| `@opentelemetry/sdk-node` | Bootstraps OTel providers at process start. |
| `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/exporter-logs-otlp-http` | OTLP/HTTP export to the OTel Collector. Vendor-neutral — backend can change without code changes. |
| `@opentelemetry/sdk-logs`, `@opentelemetry/sdk-metrics` | Provider implementations for log and metric pipelines alongside `sdk-node`. |

### Internal

| Package | Why |
|---------|-----|
| `@pulsedesk/contracts` | Shared TypeScript types for the `RiskCheckRequest` and `RiskCheckResponse` shapes. Ensures the risk-service request/response contract stays in sync with what order-service sends and reads — drift is a compile error. |

### Dev / build

| Package | Why |
|---------|-----|
| `@nestjs/cli`, `@nestjs/schematics` | NestJS build toolchain (`nest build`, `nest start --watch`). |
| `@nestjs/testing` | `Test.createTestingModule()` for isolated NestJS module contexts in unit tests. All tests are pure unit tests — no database or broker to mock. |
| `ts-jest` | TypeScript preprocessor for Jest with full type checking — catches type errors Babel would silently strip. |
| `jest`, `@types/jest` | Test runner, standard in the NestJS ecosystem. |
| `typescript` | TypeScript compiler, pinned at `~5.7.0` across the monorepo for consistency. |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting with TypeScript-aware rules. |
| `@types/node` | Node.js built-in type definitions. |
