# Test Plan — Order Service Command API and Persistence

- **TP ID:** `TP-M3-T1-order-service-command-api`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** M3-T1
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `POST /v1/orders` (submit with idempotency), `GET /v1/orders/:id` (read lifecycle state), `InternalApiKeyGuard`, domain validation, Prisma persistence, graceful shutdown.
- **Out of scope:** Risk integration (T3), order event publication (T4), load test at cluster scale (deferred).
- **Prerequisites:** `docker compose up --build order-service` with PostgreSQL healthy; `DATABASE_URL` set; `INTERNAL_ORDER_API_KEY=local-order-key-change-in-prod`; migration applied via `prisma migrate deploy`.

---

## Unit Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `Order.create` domain entity | 9 — validation, symbol normalisation, state machine | Pass |
| `SubmitOrderUseCase` | 4 — new order, idempotent replay, symbol uppercase, validation error | Pass |
| `GetOrderUseCase` | 2 — found, not found | Pass |
| `InternalApiKeyGuard` | 4 — no env (open), correct key, wrong key, missing key | Pass |
| `OrdersController` | 8 — submit new, idempotent replay, validation error → 400, GET found, GET not found → 404 | Pass |
| **Total** | **27 tests, 5 suites** | **Pass** |

---

## Integration — HTTP API

| ID | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| INT-01 | `GET /health` | `{"status":"ok"}` | ✓ | Pass |
| INT-02 | `GET /ready` | `{"status":"ready"}` | ✓ | Pass |
| INT-03 | `POST /v1/orders` — valid LIMIT order | 201, `PENDING` order with all fields | ✓ `id`, `commandId`, `symbol`, `side`, `type`, `quantity`, `limitPrice`, `status: PENDING` returned | Pass |
| INT-04 | `POST /v1/orders` — same `commandId` replayed | Returns same order (same `id`, `createdAt`) without creating duplicate | ✓ Identical response on retry | Pass |
| INT-05 | `GET /v1/orders/:id` | Order returned with correct fields | ✓ | Pass |
| INT-06 | `POST /v1/orders` — MARKET order (no `limitPrice`) | `limitPrice: null`, `status: PENDING` | ✓ | Pass |
| INT-07 | `POST /v1/orders` — LIMIT without `limitPrice` | 400 Bad Request | ✓ | Pass |
| INT-08 | `GET /v1/orders/:id` — unknown ID | 404 Not Found | ✓ | Pass |
| INT-09 | `POST /v1/orders` — wrong API key | 401 Unauthorized | ✓ | Pass |
| INT-10 | `POST /v1/orders` — zero quantity | 400 Bad Request | ✓ | Pass |

---

## Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | `POST /v1/orders` response schema | JSON with `id`, `commandId`, `symbol`, `side`, `type`, `quantity`, `limitPrice`, `status`, `rejectionReason`, `createdAt`, `updatedAt` | Pass |
| CON-02 | Idempotency key | Duplicate `commandId` returns identical `id` and `createdAt` — no duplicate row in DB | Pass |
| CON-03 | `status` on fresh order | Always `PENDING` | Pass |

---

## Resilience

| ID | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| RES-01 | SIGTERM during active connections | `SIGTERM received — readiness NOT READY` → `Prisma disconnected` → process exits cleanly | ✓ Confirmed in logs | Pass |

---

## Findings

### Fix loop — Prisma 7 driver adapter (inline fix, no blocking AC gap)

| ID | Severity | Description | Resolution |
|---|---|---|---|
| F-01 | HIGH | Prisma 7 "client" engine type (WASM query compiler) requires a driver adapter — `new PrismaClient()` fails without one. Original implementation used `extends PrismaClient` (Prisma 6 pattern). | Fixed: `PrismaService` changed to composition; `@prisma/adapter-pg` + `pg.Pool` added; `Dockerfile` updated with `npx prisma generate` before build step. |

---

## Verdict

`PASS` — All AC verified. Order submit endpoint persists with idempotency key handling. Duplicate `commandId` returns existing order deterministically. Order read returns current lifecycle state. Migration committed and applied. Graceful shutdown confirmed.

---

## Evidence

- Unit tests: 27 tests, 5 suites — all pass
- `POST /v1/orders` with valid LIMIT payload → `201` `PENDING` order in DB
- `POST /v1/orders` with same `commandId` → same `id` and `createdAt` returned (no duplicate row)
- `POST /v1/orders` LIMIT without `limitPrice` → `400`; zero quantity → `400`
- `GET /v1/orders/:id` → correct order; unknown ID → `404`
- Wrong `x-api-key` → `401`
- SIGTERM: `readiness NOT READY` → `Prisma disconnected` — confirmed in logs
- Migration `20260310000000_create_orders` applied successfully via `prisma migrate deploy`
