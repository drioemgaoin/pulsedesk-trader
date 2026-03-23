# PulseDesk Trader

A full-stack trading workstation built as a production-grade monorepo. The browser UI lets you watch live simulated market prices, submit BUY/SELL orders, and track your open positions and P&L in real time — all backed by a set of Node.js microservices communicating over Kafka, persisting to PostgreSQL, caching in Valkey (Redis-compatible), and exposing a full observability stack (Prometheus, Grafana, Loki, Tempo).

The project is designed as a realistic portfolio piece: every architectural decision you'd face in a real trading platform — pre-trade risk checks, event-driven order lifecycle, idempotent command handling, circuit breakers, horizontal scaling, Kubernetes deployment — is present and working.

---

## How it works

```
Browser UI (React + Vite)
    │
    ├── REST  ──► API Gateway (NestJS)  ──► order-service ──Kafka──► execution-service
    │                                   └──► portfolio-service      └──► portfolio-service
    │
    └── WebSocket ──► notification-service ◄──Kafka── market-data-service
                                           ◄──Kafka── execution-service (fill events)
```

Every order follows this path:

1. **Order Ticket** — you fill in symbol, side (BUY/SELL), type (MARKET/LIMIT), and quantity
2. **API Gateway** — validates your JWT, enforces identity (your `accountId` must match your token)
3. **Order Service** — performs a synchronous pre-trade risk check via HTTP, then publishes the order event to Kafka
4. **Risk Service** — evaluates position and quantity limits; returns APPROVED or REJECTED
5. **Execution Service** — consumes the Kafka event, simulates a fill, publishes a fill event
6. **Portfolio Service** — consumes the fill event, updates positions and P&L
7. **Notification Service** — fans out fill events and live market ticks to every connected WebSocket client

A MARKET order typically goes from submitted to FILLED in under 60 ms on localhost.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20.x |
| pnpm | 10.x |
| Docker + Docker Compose | v2 |

Install dependencies once:

```bash
pnpm install
```

---

## Running the full platform

Everything — all 7 backend services, infrastructure, observability, and the containerised UI — runs from a single command:

```bash
docker compose --profile frontend up --build
```

First start takes a few minutes while images build. Subsequent starts are fast (images are cached).

**Stop the platform:**

```bash
docker compose down
```

**Stop and wipe all data** (Postgres, Kafka, Valkey volumes):

```bash
docker compose down -v
```

### What's running

| URL | Service |
|-----|---------|
| http://localhost:5173 | Trader UI |
| http://localhost:3000 | API Gateway (REST) |
| ws://localhost:3016/stream | Notification service (WebSocket) |
| http://localhost:3001 | Grafana dashboards |
| http://localhost:9090 | Prometheus |

Default login: **username** `trader` / **password** `pulsedesk`

### Service ports (internal, for debugging)

| Port | Service |
|------|---------|
| 3000 | api-gateway |
| 3011 | market-data-service |
| 3012 | order-service |
| 3013 | risk-service |
| 3014 | execution-service |
| 3015 | portfolio-service |
| 3016 | notification-service |
| 5432 | PostgreSQL |
| 6379 | Valkey |

---

## The trading UI

Open http://localhost:5173 and log in with `trader` / `pulsedesk`.

The workstation is a single page divided into two rows:

```
┌─────────────────┬────────────────────────────┬──────────────────────┐
│   Watchlist     │          Chart             │    Order Ticket      │
│     22%         │           43%              │        35%           │
└─────────────────┴────────────────────────────┴──────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│                    Blotter / Positions (tabbed)                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Watchlist

Streams live simulated prices for five symbols: **AAPL, TSLA, MSFT, NVDA, AMZN**.

Each row shows Bid / Ask / Last / Volume. Prices flash green on uptick and red on downtick. Click any row to pre-fill that symbol in the Order Ticket. You can also navigate with arrow keys and press Enter to select.

The prices come from `market-data-service` via the WebSocket at `ws://localhost:3016/stream`. The connection status (connected / connecting / reconnecting) is shown in the top-right of the header.

### Chart

Displays a line chart of the last ~5 minutes of tick history (up to 300 points) for the currently selected symbol. Updates in real time as new ticks arrive over the WebSocket.

### Order Ticket

Submit a new order for the selected symbol:

| Field | Notes |
|-------|-------|
| Symbol | Auto-filled when you click a watchlist row; editable |
| Side | BUY or SELL toggle |
| Type | MARKET or LIMIT toggle |
| Quantity | Number of shares |
| Limit Price | Only shown when Type = LIMIT |

Press **Submit Order** to send. The form validates locally (Zod) before the network call. A unique idempotency key is generated automatically so double-clicks cannot produce duplicate orders.

The order will appear in the Blotter immediately with status `ACCEPTED`, then transition to `FILLED` within seconds as execution-service processes the Kafka event.

### Blotter

The Blotter tab lists all your orders. You can filter by status:

- `PENDING` — submitted but not yet risk-checked
- `ACCEPTED` — risk approved, published to Kafka
- `FILLED` — execution complete
- `PARTIALLY_FILLED` — partial execution
- `REJECTED` — risk check failed (e.g. quantity limit exceeded)
- `CANCELLED` — cancelled before execution

### Positions

The Positions tab shows your current open positions, polling every 5 seconds:

| Column | Description |
|--------|-------------|
| Symbol | Instrument |
| Qty | Total shares held |
| Avg Cost | Volume-weighted average fill price |
| Market Price | Current last price from the live feed |
| Unrealized P&L | (Market Price − Avg Cost) × Qty |

The total unrealized P&L across all positions is shown in the footer. Values are green when positive and red when negative.

---

## Simulated market data

There is no connection to any real exchange. The `market-data-service` generates randomised tick data for the five symbols and publishes them to Kafka. The `notification-service` fans these ticks out to connected WebSocket clients.

Risk limits are also simulated: the risk-service checks quantity per order and total position size against configurable thresholds. If you submit a very large order you may receive a `REJECTED` response with `QUANTITY_LIMIT_EXCEEDED`.

---

## Local development (hot-reload)

**The rule:** Docker owns what you're not touching. Your terminal owns what you are.

Every service and MFE has its own `dev:*` script that starts the full platform in Docker, removes that one piece, and runs it in your terminal in watch mode. One command, everything works, your changes are live in under 2 seconds.

---

### Working on a single backend service

```bash
pnpm dev:execution-service
```

This command:
1. Builds and starts the full platform in Docker — all 7 services, all infrastructure
2. Scales `execution-service` to 0 replicas in Docker (no port conflict)
3. Runs `execution-service` in your terminal with `nest start --watch` — auto-restarts on every `.ts` save

Replace `execution-service` with any other service:

```
pnpm dev:api-gateway
pnpm dev:market-data-service
pnpm dev:order-service
pnpm dev:risk-service
pnpm dev:execution-service
pnpm dev:portfolio-service
pnpm dev:notification-service
```

#### Debug mode

Every service also has a `:debug` variant that opens a Node.js inspector port:

```bash
pnpm dev:execution-service:debug   # opens debug port 9233
```

Each service has its own fixed debug port so you can attach to multiple at once:

| Service | Debug port |
|---------|-----------|
| api-gateway | 9229 |
| market-data-service | 9230 |
| order-service | 9231 |
| risk-service | 9232 |
| execution-service | 9233 |
| portfolio-service | 9234 |
| notification-service | 9235 |

Attach VS Code: open the Run & Debug panel → `Attach to Node Process` → select the port. Changes are still hot-reloaded while the debugger is attached.

---

### Working on a single frontend MFE

```bash
pnpm dev:trading-mfe
```

This command:
1. Starts the full backend in Docker
2. Starts just `trading-mfe` and the shell in your terminal with Vite HMR

Other MFE routes show an error fallback (their dev servers aren't running), but the route you're working on is fully live. Edit any `.tsx`/`.ts`/`.css` and the browser updates without a reload.

```
pnpm dev:trading-mfe
pnpm dev:portfolio-mfe
pnpm dev:orders-mfe
pnpm dev:simulator-mfe
```

---

### Working on everything at once

```bash
pnpm dev:all
```

Starts Postgres/Kafka/Valkey in Docker, all 7 backend services in watch mode, all 5 Vite apps with HMR — all in one terminal with colour-coded output per process.

---

### Stopping

```bash
docker compose down        # stop Docker services
# Ctrl+C in each terminal  # stop local watch processes
```

Add `-v` to wipe data volumes (Postgres, Kafka offsets, Valkey).

---

### How the hot-reload works

| What changed | What happens | Latency |
|---|---|---|
| `.tsx` / `.css` in an MFE | Vite HMR patches the module in memory — no page reload | < 500 ms |
| Any MFE remote save | Shell's `remoteHmrPlugin` detects updated `remoteEntry.js` → full reload | ~1 s |
| `.ts` in a backend service | `nest start --watch` incremental recompile → process restart | ~1-2 s |
| `.ts` in `packages/ui` | Vite picks up workspace symlink → HMR | < 500 ms |

---

### Environment variables

**Frontend** (`.env` or shell):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | REST API base URL |
| `VITE_STREAM_URL` | `ws://localhost:3016/stream` | WebSocket tick stream |
| `VITE_WATCHLIST_SYMBOLS` | `AAPL,TSLA,MSFT,NVDA,AMZN` | Comma-separated symbol list |

**Backend**: each service reads its own `.env`. Defaults connect to `localhost` on standard ports and work out of the box with local infrastructure.

---

## Useful commands

```bash
# Run all tests
pnpm test

# Lint everything
pnpm lint

# Build everything
pnpm build

# Tail logs for a specific service
docker compose logs -f order-service

# Check all container health
docker compose ps

# Open a psql shell
docker compose exec postgres psql -U pulsedesk -d pulsedesk
```

---

## Project structure

```
apps/
  trader-ui/          # Shell — React + Vite + MUI (routing, auth, Redux store, providers)
  trading-mfe/        # Remote — watchlist, chart, order ticket, blotter, positions
  portfolio-mfe/      # Remote — account summary, positions table, PnL charts
  orders-mfe/         # Remote — paginated order history, filters, cancel action
  simulator-mfe/      # Remote — traffic profile controls, live stats, order feed
services/
  api-gateway/        # NestJS — auth, rate limiting, proxying
  market-data-service/# Hono — market tick simulation, WebSocket feed
  order-service/      # NestJS — order submission, risk check, Kafka publish
  risk-service/       # NestJS — pre-trade risk evaluation
  execution-service/  # NestJS — simulated execution, fill events
  portfolio-service/  # NestJS — position tracking, P&L
  notification-service# Hono — WebSocket fanout of fills and ticks
packages/
  contracts/          # Shared TypeScript event/API types
helm/
  pulsedesk/          # Kubernetes Helm chart (production deployment)
docs/
  deployment-guide.md # Kubernetes deploy, scaling, rollback
  runbook/            # Incident runbooks and on-call checklist
```

---

## Tech stack

Every tool in this project was chosen deliberately. This section is the single place to understand what we use and why — each service README goes deeper on its own choices.

### Language & runtime

| Tool | Why |
|------|-----|
| **TypeScript** (everywhere) | One language across all 12 packages. Shared types in `@pulsedesk/contracts` are consumed by both Node.js services and React apps without any adapter layer. Strict mode on everywhere — `any` escapes are disallowed. |
| **Node.js 20 LTS** | V8's JIT + libuv async I/O handle our WebSocket + Kafka workloads without threading complexity. LTS guarantees security patches until 2026. |
| **pnpm 10 workspaces** | Monorepo package manager. Symlink-based `node_modules` — each package sees exactly its declared dependencies, not transitive ones (prevents "works on my machine" phantom imports). 2-3× faster installs than npm due to content-addressed store. |

---

### Frontend

| Tool | Why |
|------|-----|
| **React 19** | Component model for the entire UI layer. v19 brings the `use()` hook and improved concurrent features. All MFEs share one React instance via Module Federation — only one copy of React ever runs in the browser. |
| **Vite 7** | Sub-second HMR during development. ES module native — no bundling during dev, only during build. Significantly faster than webpack/CRA for large monorepos. |
| **`@originjs/vite-plugin-federation`** | Module Federation for Vite. Lets the shell lazy-load remote MFE bundles at runtime without each MFE shipping its own React/MUI copy. Chose over `@module-federation/vite` for its simpler config and better Vite 7 compatibility. |
| **MUI v6 (`@mui/material`)** | Component library. Ships every component we need (DataGrid, Dialog, Tooltip, Autocomplete, etc.) so no mixing libraries. Excellent TypeScript types. `sx` prop and `createTheme` handle all styling without separate CSS files. |
| **Emotion (`@emotion/react`, `@emotion/styled`)** | MUI v6's CSS-in-JS engine. Styles are scoped by default. Chose Emotion over styled-components because MUI uses it internally — mixing engines would create two style injection instances. |
| **Redux Toolkit + React Redux** | Global state for auth (JWT, user identity) and theme. The shell creates the store once; all MFEs consume it as a Module Federation singleton. RTK eliminates Redux boilerplate (Immer-based reducers, `createSlice`). Chose over Zustand because Redux DevTools are richer and the explicit action model is easier to trace across MFE boundaries. |
| **TanStack Query (`@tanstack/react-query`)** | Server state — caches, deduplicates, and refetches API calls. QueryClient lives in the shell and is shared as a singleton. Chose over SWR for its mutation + optimistic update API and better DevTools. |
| **React Hook Form + Zod** | Forms (order ticket, filters, login). RHF uses uncontrolled inputs — no re-render on every keystroke. Zod is TypeScript-first: the inferred type IS the schema, no duplicate type declarations. `zodResolver` connects the two with one line. Chose RHF over Formik for performance; Zod over Yup for TypeScript inference quality. |
| **Lightweight Charts (TradingView)** | Financial charts — line, area, candlestick. Renders on `<canvas>` via WebGL, handles 100ms tick updates at 60fps without React reconciliation overhead. Chose over Chart.js/Recharts because those are general-purpose and lack financial chart types (OHLC, volume histogram). |
| **RxJS** | WebSocket connection management. `webSocket()` operator + `retryWhen` + `timer` for exponential-backoff reconnection. Chose over hand-rolled `useEffect` loops because the operator composition handles race conditions (unsubscribe on unmount, retry on error) cleanly. |
| **TanStack Table** | Headless table (orders-mfe). No UI opinions — renders into MUI cells. Chose over MUI DataGrid because DataGrid is harder to customise deeply (expandable rows, status-coded borders). |
| **TanStack Virtual** | Row virtualisation (simulator log output). Renders only visible rows — DOM size stays fixed regardless of log volume. Chose over `react-window` for its headless API and better TypeScript support. |
| **date-fns** | Date formatting and arithmetic. Tree-shakable (only import what you use), immutable (no mutation bugs). Chose over moment.js (too large, mutable) and dayjs (weaker TypeScript types). |
| **react-error-boundary** | Wraps each remote MFE — one remote crashing doesn't unmount the shell. React 18+ best practice for error containment in `React.lazy` boundaries. |
| **react-transition-group v4** | Pulled in directly to apply a React 19 compatibility patch. MUI uses it internally for transitions; in React 19 `findDOMNode` was removed, breaking the `nodeRef`-less usage in v4. The shell patches `Transition.prototype.componentDidMount` to guard against `nodeRef.current === null` at mount time. |
| **Inter + JetBrains Mono (`@fontsource`)** | Self-hosted fonts — no Google Fonts CDN dependency. Works offline, no render-blocking cross-origin requests, no GDPR concerns. |

---

### Backend

| Tool | Why |
|------|-----|
| **NestJS v10** | Structured framework with dependency injection, decorators, and a module system. Enforces consistent controller/service/repository boundaries that make each layer independently testable. Chose over raw Fastify/Express because the DI container eliminates manual wiring of dependencies and the ecosystem (guards, interceptors, pipes) covers auth, validation, and logging without extra libraries. |
| **Fastify v5 (`@nestjs/platform-fastify`)** | HTTP engine under NestJS. 2-3× higher throughput than Express under load, lower memory footprint, native JSON schema validation, Pino as the default logger. All backend services run on Fastify. |
| **KafkaJS** | Kafka client for producers and consumers. Pure JavaScript/TypeScript — no native binaries, so Docker images build cleanly without cross-compilation. Excellent TypeScript types. Chose over `node-rdkafka` (native librdkafka binding) because native bindings are fragile in Docker multi-stage builds. |
| **Prisma** | ORM for order-service, execution-service, portfolio-service. Type-safe query API generated from the schema — no raw SQL strings, no risk of SQL injection. `prisma migrate` handles schema versioning with a migration history committed to git. Chose over TypeORM (brittle with strict TS, weak migration story) and Sequelize (runtime type errors, verbose). |
| **PostgreSQL** | Primary persistence for three services (orders, executions, positions). Each service owns its own schema — no shared tables. ACID guarantees for order state transitions and fill idempotency checks. |
| **Valkey (Redis-compatible)** | In-memory store. Used by the API Gateway for two things: rate limiter counters (shared across replicas via `@nest-lab/throttler-storage-redis`) and watchlist snapshot cache (1-second TTL). Valkey is a Redis fork maintained by the Linux Foundation after the Redis licence change — drop-in compatible, fully open-source. |
| **opossum** | Circuit breaker. Wraps the synchronous HTTP calls from api-gateway → order-service/portfolio-service and order-service → risk-service. Three states: Closed (normal), Open (fail immediately after threshold), Half-open (probe recovery). Prevents a degraded downstream from cascading. Chose for its maturity and built-in Prometheus metric integration. |
| **class-validator + class-transformer** | Declarative DTO validation via decorators. Works natively with NestJS's `ValidationPipe` — incoming JSON is validated and deserialized automatically. No manual `if (!body.field)` guards. |
| **Pino (`nestjs-pino`, `pino-http`)** | Structured JSON logger. Serialises log entries asynchronously in a worker thread — near-zero impact on request latency. All logs go to stdout → Docker log driver → Loki. Chose over Winston for performance; over Bunyan for active maintenance and NestJS integration. |
| **passport + passport-jwt** | JWT extraction and verification on incoming requests in the API Gateway. NestJS guards wrap passport strategies — `@UseGuards(JwtAuthGuard)` on any controller is the complete auth enforcement. |
| **`ws`** | Raw WebSocket library in notification-service. Chose over Socket.IO because browser clients use native WebSocket, not the Socket.IO protocol — no handshake overhead, no polling fallback, no rooms/namespaces we don't use. |
| **`jsonwebtoken`** | Direct JWT verification in notification-service for the WebSocket handshake. On WS connections, HTTP interceptors don't run — the token is in the query string or header, verified synchronously at connection time. Kept separate from passport because passport's strategy model is built around HTTP request/response cycles. |
| **`p-retry`** | Automatic retry with exponential backoff for transient HTTP failures (api-gateway outbound calls). Separate from the circuit breaker — retries handle brief blips before the circuit opens. |
| **`ioredis`** | Redis/Valkey client in the API Gateway. Chose over `node-redis` for superior TypeScript types, pipeline API, and cluster mode support. |
| **`reflect-metadata`** | Required by TypeScript's `emitDecoratorMetadata` — NestJS decorators (`@Inject`, `@Controller`, `@Module`) depend on it. Must be the first import in every service entry point. |

---

### Infrastructure

| Tool | Why |
|------|-----|
| **Apache Kafka** | Event bus between services. Decouples producers from consumers (order-service publishes and moves on; execution-service, portfolio-service, notification-service consume independently). Persistent log — if a consumer restarts, it replays from the last committed offset, no events lost. Consumer groups enable horizontal scaling: add replicas, Kafka distributes partitions automatically. |
| **Docker + Docker Compose** | Every service and infrastructure dependency runs in a container. Compose orchestrates the full platform with one command. Multi-stage Dockerfiles keep production images small (build stage vs runtime stage). |
| **Helm (Kubernetes)** | Production deployment. The `helm/pulsedesk/` chart parametrises replicas, resource limits, and image tags per environment. Rolling updates with health check gates ensure zero-downtime deploys. |

---

### Observability

| Tool | Why |
|------|-----|
| **OpenTelemetry (`@opentelemetry/auto-instrumentations-node`)** | Vendor-neutral instrumentation. One package auto-traces HTTP requests, outbound calls, Kafka produce/consume, and database queries — no `span.start()` calls in business code. OTLP export means switching backends (e.g. Datadog → Honeycomb) is a collector config change, not a code change. |
| **OTel Collector** | Central telemetry hub. Receives OTLP from all services, fans out to Tempo (traces), Prometheus (metrics), and Loki (logs). Services send to one endpoint; the collector handles backend routing. |
| **Grafana** | Unified dashboard for traces, metrics, and logs. Correlate a slow request trace in Tempo with the service's CPU metric in Prometheus and its log line in Loki — all from one UI. |
| **Prometheus** | Metrics storage and alerting. Scrapes `/metrics` from each service. Standard pull model. |
| **Loki** | Log aggregation. Receives structured JSON logs from the OTel Collector. Label-based indexing (no full-text index) keeps storage small while still allowing fast filtered queries. |
| **Tempo** | Distributed trace storage. Stores spans from all services; links traces to Loki logs via trace ID. |

---

### Testing

| Tool | Why |
|------|-----|
| **Jest** | Unit and integration tests for all backend services and frontend packages. NestJS's testing module (`@nestjs/testing`) creates a DI container in test scope — real injectable classes, mocked at the port boundary. |
| **Playwright** | End-to-end tests. Drives a real browser against the running platform. Tests the full order lifecycle (submit → risk check → fill → blotter update) as a user would experience it. Chose over Cypress for faster execution, better multi-tab support, and first-class TypeScript. |

---

### Shared packages

| Package | Why |
|---------|-----|
| **`@pulsedesk/contracts`** | Pure TypeScript types — HTTP DTOs, Kafka event interfaces, WebSocket message shapes. Zero runtime code (types compile away). One source of truth: frontend and backend import from the same package, so a schema change is a compile error in both places simultaneously. |
| **`@pulsedesk/ui`** | Component library and design system. Declares MUI/Emotion/React as `peerDependencies` (not direct deps) so it never bundles its own copy — the shell's Module Federation singletons are used at runtime. Centralises the MUI theme, CSS custom properties, and trading-specific components (status chips, side toggles, colour tokens). |

---

## Architecture deep-dive

### Micro-frontend shell (Module Federation)

The browser application is composed of five independent Vite apps:

```
trader-ui (HOST, :5173)
  ├── loads tradingMfe  → http://localhost:5174/assets/remoteEntry.js
  ├── loads portfolioMfe → http://localhost:5175/assets/remoteEntry.js
  ├── loads ordersMfe    → http://localhost:5176/assets/remoteEntry.js
  └── loads simulatorMfe → http://localhost:5177/assets/remoteEntry.js
```

The shell owns all **singletons** (React, React DOM, React Router, Redux store, TanStack Query client, MUI, Emotion, `@pulsedesk/ui`). These are declared as `shared` in the federation config and hoisted — only one instance of each lives in memory regardless of how many remotes are loaded. Remotes consume them transparently via `useSelector`, `useNavigate`, etc.

During development, the shell's `remoteHmrPlugin` watches each remote's `remoteEntry.js` for changes. When a remote's Vite server rebuilds (on any file save), the plugin triggers a full-page reload in the shell so the updated remote is picked up immediately. This gives you the same live-reload experience as a monolithic SPA.

**Why Module Federation over a monolithic SPA?**
- Each "screen" (terminal, portfolio, orders, simulator) can be built and deployed independently
- Lazy loading: the trading terminal code doesn't ship with the order history code
- Team scalability: separate teams can own separate remotes without merge conflicts on a shared codebase

### Event-driven microservices

All backend services communicate via **Apache Kafka** (event bus) rather than direct HTTP calls (except the synchronous pre-trade risk check). This means:

```
Order Service  →  Kafka: orders.events.v1  →  Execution Service
                                            →  (other future consumers)

Execution Service  →  Kafka: executions.events.v1  →  Order Service    (marks order FILLED)
                                                    →  Portfolio Service (updates holdings)
                                                    →  Notification Svc (broadcasts fill)

Market Data  →  Kafka: market.ticks.v1  →  Execution Service  (triggers limit order matching)
                                         →  Portfolio Service  (updates unrealised P&L)
                                         →  Notification Svc  (broadcasts price to browser)
```

**Why Kafka over direct HTTP between services?**
- Decoupling: the order service publishes and moves on; it doesn't care how many services consume
- Reliability: if the execution service restarts, it replays from the last committed offset — no events are lost
- Scalability: add more replicas of any consumer; Kafka distributes partitions automatically

### CQRS-lite (no full event sourcing)

Commands (order submission) flow **synchronously**: browser → API Gateway → Order Service → PostgreSQL → Kafka.

Events flow **asynchronously**: Kafka → consumer services → their own PostgreSQL tables.

Each service is its own source of truth. There is no global event log that you replay to rebuild state. This is a pragmatic middle ground between full CQRS/ES (complex, good for audit trails) and monolithic shared DB (simple, no service isolation).

### Idempotency everywhere

Kafka delivers messages **at least once**. A broker restart or rebalance can redeliver the same event. Every consumer handles this:

- **Order Service**: `commandId` (UUID v4 from the browser) is the idempotency key. Inserting an order with a duplicate `commandId` returns the existing order instead of creating a new one.
- **Execution Service**: before creating an execution, it queries `findByIdempotencyKey(orderId)`. A duplicate fill event is a no-op.

### Circuit breaker (Risk Service)

The Order Service calls the Risk Service synchronously via HTTP. If risk is slow or down, a naive implementation would pile up threads waiting for timeouts. Instead, the Order Service wraps the HTTP call in an **opossum** circuit breaker:

- **Closed** (normal): requests flow through
- **Open** (failures above threshold): requests fail immediately with `503 Service Unavailable` — no waiting
- **Half-open** (recovery probe): one request allowed through; if it succeeds, the circuit closes

This prevents a degraded Risk Service from cascading into a degraded Order Service.

### Limit order fill price (market price, not limit price)

A BUY LIMIT order at $150 means "buy only when market price drops to $150 or below." When the condition is met, the order fills at the **current market tick price** — which could be $148 if the price gapped down. The trader gets **price improvement** (a better price than their limit).

This mirrors real exchange behaviour (the limit price is a guard, not a target). Filling at the limit price regardless of the market price would systematically overcharge buyers and undercharge sellers.

### Graceful shutdown

All services intercept `SIGTERM` and `SIGINT`:

1. Mark `/health/ready` → `503 Service Unavailable` (load balancer stops routing new requests)
2. Wait `SHUTDOWN_TIMEOUT_MS` (default 25 s) for in-flight requests and Kafka commits to drain
3. Hard-exit

This enables **zero-downtime rolling deploys** in Docker Swarm or Kubernetes: the orchestrator sends SIGTERM to the old replica, waits for `/health/ready` to go unhealthy, routes traffic to the new replica, and kills the old one only after the drain window.

### Observability (OpenTelemetry)

Every service runs `@opentelemetry/auto-instrumentations-node` and exports traces, metrics, and logs to the OpenTelemetry Collector over OTLP HTTP (port 4318). The collector fans out to:

- **Tempo** — traces (visualise request flows end-to-end across services)
- **Prometheus** — metrics (scrapes `/metrics` from each service)
- **Loki** — logs (structured JSON from nestjs-pino)
- **Grafana** — unified dashboard for all three signals at http://localhost:3001

Switching to a different observability vendor (Datadog, Honeycomb, Dynatrace) is a collector config change — no code changes in any service.

---

## Quick reference

### Working on one thing (most common)

```bash
# Backend — whole platform in Docker, your service in your terminal
pnpm dev:api-gateway
pnpm dev:market-data-service
pnpm dev:order-service
pnpm dev:risk-service
pnpm dev:execution-service
pnpm dev:portfolio-service
pnpm dev:notification-service

# Backend — same but with Node.js debugger attached (see debug ports table in dev section)
pnpm dev:execution-service:debug

# Frontend MFE — backend in Docker, your MFE + shell in your terminal
pnpm dev:trading-mfe
pnpm dev:portfolio-mfe
pnpm dev:orders-mfe
pnpm dev:simulator-mfe
```

### Working on everything

```bash
pnpm dev:all          # infra in Docker + all 7 backend services + all 5 MFEs, all hot-reloading
pnpm dev:backend      # all 7 backend services in watch mode (needs infra: pnpm dev:infra first)
pnpm dev:frontend     # all 5 Vite apps with HMR (needs backend running)
pnpm dev:infra        # Postgres + Kafka + Valkey in Docker only
```

### Other

```bash
pnpm --filter @pulsedesk/storybook dev                      # component library docs  :6006
docker compose up --build --no-deps execution-service       # rebuild one Docker service
docker compose up -d prometheus loki tempo otel-collector grafana   # observability stack
```

---

## Running tests

```bash
# All unit tests across the whole monorepo
pnpm test:unit

# One service
pnpm --filter @pulsedesk/execution-service test

# Watch mode while developing
pnpm --filter @pulsedesk/order-service test:watch

# Integration tests (requires Docker infra running)
pnpm test:integration

# End-to-end Playwright tests (requires full stack)
pnpm test:e2e

# E2E in interactive browser UI
pnpm --filter @pulsedesk/e2e test:ui
```

---

## Horizontal scaling

The `docker-compose.scale.yml` overlay adds an NGINX load balancer and scales services horizontally:

```bash
docker compose -f docker-compose.yml -f docker-compose.scale.yml up --build
```

| Service | Replicas | Strategy |
|---------|---------|---------|
| api-gateway | 3 | Round-robin |
| notification-service | 2 | IP-hash sticky (WebSocket sessions) |
| execution-service | 2 | Kafka consumer group partition rebalancing |
| portfolio-service | 2 | Kafka consumer group partition rebalancing |
| order-service | 2 | Idempotency key deduplication prevents double orders |
| risk-service | 2 | Stateless — any replica handles any request |

---

## All ports at a glance

| Component | Port | Notes |
|-----------|------|-------|
| Frontend shell | **5173** | Dev: Vite HMR. Prod: NGINX |
| trading-mfe | 5174 | Dev only |
| portfolio-mfe | 5175 | Dev only |
| orders-mfe | 5176 | Dev only |
| simulator-mfe | 5177 | Dev only |
| Storybook | 6006 | Dev only |
| API Gateway | **3000** | All browser HTTP calls land here |
| market-data-service | 3011 | Internal |
| order-service | 3012 | Internal + Swagger at /docs |
| risk-service | 3013 | Internal |
| execution-service | 3014 | Internal |
| portfolio-service | 3015 | Internal |
| notification-service | **3016** | Internal + WebSocket at /stream |
| PostgreSQL | 5432 | Shared by order, execution, portfolio services |
| Valkey (Redis) | 6379 | API Gateway rate limiting |
| Grafana | **3001** | All observability dashboards |
| Prometheus | 9090 | Bound to 127.0.0.1 |
| OTel Collector | 4317 / 4318 | gRPC / HTTP |
| Loki | 3100 | Log aggregation |
| Tempo | 3200 | Trace storage |

---

## Service READMEs

Each service and app has its own README with detailed design notes, API reference, Kafka topic listing, and environment variable documentation:

| Component | README |
|-----------|--------|
| api-gateway | [services/api-gateway/README.md](services/api-gateway/README.md) |
| market-data-service | [services/market-data-service/README.md](services/market-data-service/README.md) |
| order-service | [services/order-service/README.md](services/order-service/README.md) |
| risk-service | [services/risk-service/README.md](services/risk-service/README.md) |
| execution-service | [services/execution-service/README.md](services/execution-service/README.md) |
| portfolio-service | [services/portfolio-service/README.md](services/portfolio-service/README.md) |
| notification-service | [services/notification-service/README.md](services/notification-service/README.md) |
| trader-ui (shell) | [apps/trader-ui/README.md](apps/trader-ui/README.md) |
| trading-mfe | [apps/trading-mfe/README.md](apps/trading-mfe/README.md) |
| portfolio-mfe | [apps/portfolio-mfe/README.md](apps/portfolio-mfe/README.md) |
| orders-mfe | [apps/orders-mfe/README.md](apps/orders-mfe/README.md) |
| simulator-mfe | [apps/simulator-mfe/README.md](apps/simulator-mfe/README.md) |
| Storybook | [apps/storybook/README.md](apps/storybook/README.md) |
| @pulsedesk/ui | [packages/ui/README.md](packages/ui/README.md) |
| @pulsedesk/contracts | [packages/contracts/README.md](packages/contracts/README.md) |
