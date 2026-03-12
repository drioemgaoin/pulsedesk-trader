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

Everything — all 7 backend services, infrastructure, observability, and the UI — runs from a single command:

```bash
docker compose up --build
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

For active development you run the backend in Docker and the UI locally so Vite's hot-module replacement picks up your changes instantly.

**Step 1 — start the backend services only:**

```bash
docker compose up --build --scale trader-nginx=0
```

This starts all infrastructure and backend services but skips the containerised NGINX UI build.

**Step 2 — run all five MFE apps locally:**

Each app has its own Vite dev server. Start the four remotes first, then the shell:

```bash
# In separate terminals (or use a process manager like concurrently):
pnpm --filter @pulsedesk/trading-mfe dev    # http://localhost:5174
pnpm --filter @pulsedesk/portfolio-mfe dev  # http://localhost:5175
pnpm --filter @pulsedesk/orders-mfe dev     # http://localhost:5176
pnpm --filter @pulsedesk/simulator-mfe dev  # http://localhost:5177
pnpm --filter @pulsedesk/trader-ui dev      # http://localhost:5173 (shell — start last)
```

Copy `.env.example` to `.env.local` in `apps/trader-ui/` and confirm the dev-profile remote URLs are active (the `http://localhost:517x` variants, not the NGINX sub-path variants).

The shell loads at http://localhost:5173. Edit any file under any `apps/*/src/` directory and the relevant app's Vite HMR updates the browser immediately.

**Step 3 — stop the backend when done:**

```bash
docker compose down
```

### Changing a backend service

If you need to change a backend service and see the effect live:

```bash
# Rebuild and restart only that service (e.g. order-service)
docker compose up --build --no-deps order-service
```

The service restarts with the new code. Other containers are unaffected.

### Environment variables (UI)

The UI reads these from `.env` or the shell when running locally:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | REST API base URL |
| `VITE_STREAM_URL` | `ws://localhost:3016/stream` | WebSocket tick stream |
| `VITE_WATCHLIST_SYMBOLS` | `AAPL,TSLA,MSFT,NVDA,AMZN` | Comma-separated symbol list |

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
  trader-ui/          # React + Vite + Tailwind workstation SPA
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
