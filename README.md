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

For active development you run the backend in Docker and the frontend locally so Vite's hot-module replacement picks up your changes instantly — no rebuilding containers.

### Step 1 — start all backend services (no frontend)

`trader-nginx` (the containerised UI) is assigned a `frontend` Docker Compose profile so it is skipped unless you explicitly opt in. A plain `up` starts everything else:

```bash
docker compose up --build
```

All infrastructure and backend services start. `trader-nginx` is not started, so there is no conflict with your local Vite dev servers.

> **Tip:** subsequent starts are fast — images are already built, so you can drop `--build` unless you changed a service.

### Step 2 — run the frontend locally

The UI is split into five Vite apps (one shell + four MFE remotes). The **remotes must start before the shell** because the shell resolves their `remoteEntry.js` URLs on startup.

Start all five apps in one terminal:

```bash
pnpm dev:frontend
```

This runs all remotes and the shell concurrently with colour-coded output per app. Open **http://localhost:5173** and log in with `trader` / `pulsedesk`.

Edit any file under `apps/*/src/` and the browser updates instantly via HMR — no page reload needed for most changes.

> **Minimum setup:** only `trading-mfe` is fully implemented right now. If you only need the trading terminal, you can start just the two relevant apps instead:
> ```bash
> pnpm --filter @pulsedesk/trading-mfe dev  # port 5174 — start first
> pnpm --filter @pulsedesk/trader-ui dev    # port 5173 — open in browser
> ```
> The other routes show an error fallback if their remote isn't running, but the rest of the app works fine.

### Step 3 — stop everything when done

```bash
# Stop the backend
docker compose down

# Stop the Vite servers: Ctrl+C in each terminal tab
```

### Changing a backend service

If you edit a backend service and want to see the effect immediately:

```bash
# Rebuild and restart only that service (e.g. order-service)
docker compose up --build --no-deps order-service
```

All other containers are unaffected.

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
