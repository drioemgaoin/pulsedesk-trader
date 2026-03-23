# notification-service

Bridges Kafka events to browser clients over WebSocket — streaming real-time market ticks and order fill notifications to authenticated traders.

## Responsibilities

- Maintain persistent WebSocket connections with browser clients at the `/stream` path
- Authenticate each connection on upgrade using a JWT passed as the `?token=` query parameter (or `Authorization` header)
- Accept `subscribe` / `unsubscribe` control messages from clients to manage per-symbol tick subscriptions (max 50 symbols per client)
- Consume `market.ticks.v1` from Kafka and broadcast each tick to all clients subscribed to that symbol
- Consume `executions.events.v1` from Kafka and push `order.filled` messages to the specific client account that owns the filled order
- Apply backpressure protection: drop messages to slow consumers whose TCP write buffer exceeds 64 KiB rather than unboundedly buffering
- Track connection count, messages sent, and dropped messages in-process (accessible via metrics)
- Expose Prometheus metrics at `/metrics` and health probes at `/health/live` and `/health/ready`

## Architecture & Design Decisions

### `ws` library over Socket.IO

Socket.IO adds significant overhead: a custom framing protocol, a polling fallback transport, and a large client bundle. Browser WebSocket support has been universal since 2012. The raw `ws` library is used instead — it is NestJS WebSocket adapter-compatible, delivers native WebSocket frames, and has minimal overhead. The trade-off is no automatic reconnection logic on the client side, but the PulseDesk frontend implements its own reconnect loop.

### JWT in the query string

The WebSocket upgrade request is a plain HTTP request, but browser `WebSocket` constructors do not support setting custom headers. The industry-standard workaround is to pass the JWT as a `?token=` query parameter. The service also accepts the `Authorization: Bearer <jwt>` header for non-browser clients (e.g., test scripts). The token is verified against `JWT_SECRET` with `jsonwebtoken`. Connections without a valid token receive close code `4401`.

### Per-symbol subscription model

Rather than broadcasting every tick to every connected client, the gateway maintains a `Map<WebSocket, Set<string>>` subscription registry. On each tick event, only clients subscribed to the tick's symbol receive the message. This makes the broadcast fan-out proportional to the number of subscribers per symbol rather than the total client count.

A cap of 50 symbols per client prevents a single client from subscribing to the entire market and monopolising the server's serialisation budget.

### Backpressure handling

Node.js `ws` writes are non-blocking: if the underlying TCP socket's write buffer is full (the client is consuming messages slower than they arrive), `client.send()` queues the data in `_socket.writableLength`. If this exceeds 64 KiB, the message is dropped and `droppedMessages` is incremented rather than allowing the buffer to grow without bound. A client that is consistently slow will see gaps in its tick stream but will not cause server-side memory pressure or head-of-line blocking for other clients.

### Fill routing by accountId

Fill notifications are scoped to the owning account: `broadcastFill()` reads the decoded `accountId` stored in `accountIds` at connection time and only delivers the message to that client. In dev mode (no `JWT_SECRET`), `accountId` is `null` and fill messages are broadcast to all connections — this is intentional for local development convenience and is logged as a warning.

### Kafka consumer groups

The service joins the consumer group `notification-service`. Multiple replicas share partition load. Because WebSocket connections are pinned to a specific replica (HTTP upgrade is sticky at the load balancer), a tick event processed by replica A will not be seen by replica B's subscribers unless sticky routing is configured. In the current single-replica development setup, this is not an issue. In a multi-replica deployment, client connections must be routed to the same replica consistently (e.g., via consistent hashing on a session cookie).

### No persistent state

There is no database. Connection state, subscriptions, and the metrics counters are all held in process memory. A service restart drops all WebSocket connections; clients are expected to reconnect and re-subscribe. This is consistent with the ephemeral nature of a real-time streaming service.

### Graceful shutdown

On SIGTERM: readiness → NOT_READY (prevents new connections from being routed here), Kafka consumers stop polling, the WebSocket server stops accepting upgrades, and the hard exit fires after 25 seconds. Existing WebSocket connections are closed during the NestJS shutdown lifecycle.

## WebSocket Protocol

Connect:

```
ws://notification-service:3016/stream?token=<jwt>
```

On successful connection the client receives no initial message. The client must send a `subscribe` control message to start receiving ticks.

### Client → Server messages

```json
{ "event": "subscribe",   "data": { "symbols": ["AAPL", "MSFT"] } }
{ "event": "unsubscribe", "data": { "symbols": ["MSFT"] } }
```

### Server → Client messages

**Subscription acknowledgement** (sent after subscribe/unsubscribe):

```json
{ "event": "subscribed", "data": { "symbols": ["AAPL"] } }
```

**Market tick** (sent on each Kafka tick for a subscribed symbol):

```json
{
  "event": "market.tick",
  "symbol": "AAPL",
  "bid": 174.88,
  "ask": 174.92,
  "last": 174.90,
  "volume": 4312,
  "timestamp": "2026-03-23T10:42:01.234Z"
}
```

**Order fill** (sent to the owning account only):

```json
{
  "event": "order.filled",
  "data": {
    "orderId": "...",
    "symbol": "AAPL",
    "side": "BUY",
    "filledQuantity": 10,
    "fillPrice": 174.90,
    "accountId": "acc-001"
  }
}
```

### Close codes

| Code | Meaning |
|---|---|
| `4401` | Unauthorized — missing or invalid JWT |

## HTTP API

```
GET /health/live
GET /health/ready
GET /metrics        — Prometheus text format
```

## Kafka Topics

| Direction | Topic | Consumer group | Event types |
|---|---|---|---|
| Consumes | `market.ticks.v1` | `notification-service` | `MarketTickEvent` |
| Consumes | `executions.events.v1` | `notification-service` | `OrderFilled` |

Produced topics: none.

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3016` | HTTP listen port (WebSocket upgrade also served on this port) |
| `JWT_SECRET` | — | Secret for JWT verification. If unset, auth is bypassed (dev mode, logs a warning) |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `notification-service` | Kafka client ID |
| `KAFKA_CONSUMER_GROUP` | `notification-service` | Consumer group ID |
| `SHUTDOWN_TIMEOUT_MS` | `25000` | Hard exit timeout after SIGTERM |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint |
| `NODE_ENV` | `development` | Environment name |

## Running Locally

### Standalone (pnpm)

```bash
pnpm --filter @pulsedesk/notification-service start:dev
```

The service starts on port 3016. Requires Kafka on port 9092. In dev mode (no `JWT_SECRET`), connections are accepted without a token.

To test the WebSocket stream locally:

```bash
# Using wscat (npm i -g wscat)
wscat -c "ws://localhost:3016/stream"
> {"event":"subscribe","data":{"symbols":["AAPL"]}}
< {"event":"subscribed","data":{"symbols":["AAPL"]}}
# Ticks arrive every ~500ms
```

### Via Docker Compose

```bash
docker compose up notification-service
```

## Running Tests

```bash
pnpm --filter @pulsedesk/notification-service test
pnpm --filter @pulsedesk/notification-service test:cov
```

The test suite covers:
- `MarketStreamGateway` — connection auth (valid JWT, invalid JWT, missing JWT), subscribe/unsubscribe handling, tick broadcast filtering by symbol subscription, fill routing by accountId, backpressure drop logic, subscription cap enforcement
- `KafkaOrderFilledConsumer` — message dispatch to gateway
- `KafkaMarketTickConsumer` — message dispatch to gateway
- Gateway contract spec — asserts WS message shapes match `@pulsedesk/contracts` definitions
- Consistency spec — asserts that subscribe/unsubscribe round-trips leave subscriptions in the expected state

## Notable Implementation Details

- **`WS_OPEN = 1` literal**: The gateway uses the literal `1` rather than `WebSocket.OPEN` to avoid a CommonJS default-import issue with the `ws` package under the NestJS module system. This is documented inline in the source.
- **`_socket.writableLength` introspection**: Backpressure is detected by reading `_socket?.writableLength` from the `ws` internals interface. This is an internal API — the `WsInternals` interface is defined locally to make the access explicit and type-safe.
- **Metrics controller spec**: `metrics.controller.spec.ts` asserts that the `/metrics` endpoint returns a non-empty Prometheus text payload, catching regressions where the prom-client registry is accidentally cleared or the controller route is removed.
- **OTel**: Kafka consumer calls are auto-instrumented. Trace context from the fill event headers is propagated into the WebSocket fan-out span, linking a fill trace end-to-end from order submission through to browser delivery in Grafana Tempo.

## Dependencies

### Framework

| Package | Why |
|---------|-----|
| `@nestjs/common`, `@nestjs/core` | Structured DI framework. The two Kafka consumers (ticks, fills) and the WebSocket gateway each live in isolated NestJS modules — independently testable without starting a real Kafka broker or WebSocket server. |
| `@nestjs/platform-fastify`, `fastify` | Fastify as the HTTP engine for the health and metrics endpoints. Consistent with the rest of the platform; the WebSocket upgrade path is handled separately by `@nestjs/platform-ws`. |
| `@nestjs/websockets`, `@nestjs/platform-ws` | NestJS WebSocket gateway support. `@nestjs/platform-ws` uses the `ws` library (not Socket.IO) as the underlying WebSocket implementation. `@WebSocketGateway` manages connection lifecycle; `@SubscribeMessage` routes incoming `subscribe`/`unsubscribe` control messages. |
| `@nestjs/swagger` | Auto-generates internal Swagger docs at `/docs`. |
| `reflect-metadata` | Enables TypeScript's `emitDecoratorMetadata` — required by every NestJS decorator. Must be the first import in the entry point. |
| `rxjs` | Required by NestJS internals. Not used directly in business code. |

### HTTP & Security

| Package | Why |
|---------|-----|
| `@fastify/cors` | CORS headers for the HTTP endpoints (health, metrics). |
| `@fastify/helmet` | HTTP security headers in a single call. |
| `@fastify/static` | Serves the OpenAPI JSON file as a static asset for the Swagger UI. |

### WebSocket

| Package | Why |
|---------|-----|
| `ws` | Raw WebSocket library used by `@nestjs/platform-ws`. Chosen over Socket.IO because: (1) browser `WebSocket` is native since 2012 — no Socket.IO framing protocol overhead or polling fallback needed; (2) `ws` is significantly lighter with no rooms/namespaces/auto-reconnect overhead; (3) backpressure handling is transparent — `_socket.writableLength` can be read directly to detect slow consumers and drop messages before buffers grow unboundedly. |
| `jsonwebtoken` | Direct JWT verification at WebSocket upgrade time. Browser `WebSocket` constructors do not support custom headers, so the token arrives in the query string; standard HTTP interceptors and Passport guards do not fire on a WebSocket upgrade. Using `jsonwebtoken` directly (rather than Passport) keeps the handshake auth synchronous and simple. Connections without a valid token are closed with code `4401`. |

### Kafka

| Package | Why |
|---------|-----|
| `kafkajs` | Consumer of `market.ticks.v1` (fan-out to subscribed clients) and `executions.events.v1` (route fill to the owning account). Pure JavaScript/TypeScript with no native binaries. Chosen over `node-rdkafka` for the same Docker portability reason as every other service. Consumer group ID means multiple replicas share partition load — each tick/fill is processed by one replica, which broadcasts to its locally-connected WebSocket clients. |

### Internal

| Package | Why |
|---------|-----|
| `@pulsedesk/contracts` | Shared TypeScript types for `MarketTickEvent` and `OrderFilled`. Ensures the WebSocket message shapes match what Kafka producers emit — schema drift is a compile error, not a silent runtime parsing failure. |

### Observability

| Package | Why |
|---------|-----|
| `nestjs-pino`, `pino`, `pino-http` | Structured JSON logging. Each connection, disconnection, and subscription change is logged with the client's `accountId` for traceability. Pino's async serialisation has near-zero latency impact on the hot path. |
| `@opentelemetry/auto-instrumentations-node` | Zero-code instrumentation — automatically traces Kafka consumer calls. Trace context from fill event headers is propagated into the WebSocket fan-out span, making fill delivery traceable end-to-end in Grafana Tempo. |
| `@opentelemetry/sdk-node` | Bootstraps OTel providers at process start. |
| `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/exporter-logs-otlp-http` | OTLP/HTTP export to the OTel Collector. Vendor-neutral — backend can change without code changes. |
| `@opentelemetry/sdk-logs`, `@opentelemetry/sdk-metrics` | Provider implementations for log and metric pipelines alongside `sdk-node`. |

### Dev / build

| Package | Why |
|---------|-----|
| `@nestjs/cli`, `@nestjs/schematics` | NestJS build toolchain (`nest build`, `nest start --watch`). |
| `@nestjs/testing` | `Test.createTestingModule()` for isolated NestJS module contexts in unit tests. |
| `ts-jest` | TypeScript preprocessor for Jest with full type checking — catches type errors Babel would silently strip. |
| `jest`, `@types/jest` | Test runner, standard in the NestJS ecosystem. |
| `pino-pretty` | Pretty-prints Pino JSON in the terminal during local development. Disabled in production. |
| `@types/jsonwebtoken` | TypeScript types for `jsonwebtoken` — used in the WebSocket auth handler. |
| `@types/ws` | TypeScript types for the `ws` library — needed for `_socket.writableLength` introspection and typing WebSocket instances in the gateway. |
| `typescript` | TypeScript compiler, pinned at `~5.7.0` across the monorepo for consistency. |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting with TypeScript-aware rules. |
| `@types/node` | Node.js built-in type definitions. |
