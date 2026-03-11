# Test Plan — Read Model APIs for UI Consumption

- **TP ID:** `TP-M5-T1-read-model-apis`
- **Date:** 2026-03-11
- **Last updated:** 2026-03-11
- **Status:** active
- **Owner:** @qa
- **Related milestone/task:** M5-T1
- **Verdict:** PASS

---

## Scope

- **In scope:** Positions IDOR fix, orders pagination/filtering, watchlist symbol filter, Valkey cache-aside, new contracts (`PaginationMetaV1`, `OrdersPageV1`, `GetWatchlistQueryV1`)
- **Out of scope:** Portfolio-service internal position calculation, notification-service, UI rendering
- **Prerequisites:** Unit tests passing (`pnpm test`), build passing (`pnpm build`)

---

## Test Cases

### Unit / Component

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| U-01 | `GetOrdersUseCase.execute({ accountId })` — defaults | limit=50, offset=0 passed to repo | Verified in spec | Pass |
| U-02 | `GetOrdersUseCase.execute({ accountId, limit: 10, offset: 20 })` | params forwarded, result contains limit/offset/total | Verified in spec | Pass |
| U-03 | `GetOrdersUseCase.execute({ accountId, status: 'FILLED' })` | status forwarded to repo | Verified in spec | Pass |
| U-04 | `ValkeyWatchlistCacheAdapter.get()` — cache hit | Returns parsed `WatchlistResponseV1` | Verified in spec | Pass |
| U-05 | `ValkeyWatchlistCacheAdapter.get()` — cache miss | Returns null | Verified in spec | Pass |
| U-06 | `ValkeyWatchlistCacheAdapter.get()` — Redis throws | Returns null (fail-open) | Verified in spec | Pass |
| U-07 | `ValkeyWatchlistCacheAdapter.set()` — stores with TTL=1s | Redis SET called with EX 1 | Verified in spec | Pass |
| U-08 | `ValkeyWatchlistCacheAdapter.set()` — Redis throws | Does not re-throw (fail-open) | Verified in spec | Pass |
| U-09 | `WatchlistController.get()` — cache hit | Returns cached response, proxy not called | Verified in spec | Pass |
| U-10 | `WatchlistController.get()` — cache miss | Proxies, caches, returns response | Verified in spec | Pass |
| U-11 | `WatchlistController.get('AAPL,MSFT')` — symbol filter from cache | Returns only AAPL and MSFT quotes | Verified in spec | Pass |
| U-12 | `WatchlistController.get('TSLA')` — symbol filter on cache miss | Fetches full response, caches it, returns filtered | Verified in spec | Pass |
| U-13 | `PositionsController.get()` — authenticated request | Proxies to `/v1/positions/:sub` | Verified in spec | Pass |
| U-14 | `PositionsController.get()` — no JWT user | Throws `UnauthorizedException` | Verified in spec | Pass |
| U-15 | `OrdersController.list()` — forwards status/limit/offset | URL contains all three params | Verified in spec | Pass |
| U-16 | `GetWatchlistUseCase.execute(['AAPL','TSLA'])` — symbol filter | Returns only AAPL and TSLA quotes | Verified in spec | Pass |
| U-17 | `GetWatchlistUseCase.execute([])` — empty filter | Returns all quotes | Verified in spec | Pass |
| U-18 | `market-data WatchlistController.get('aapl,tsla')` | Calls use-case with `['AAPL','TSLA']` | Verified in spec | Pass |
| U-19 | `order-service OrdersController.list` — invalid status | Throws `BadRequestException` | Verified in contract spec | Pass |
| U-20 | `order-service OrdersController.list` — limit > 200 | Throws `BadRequestException` | Verified in contract spec | Pass |
| U-21 | `order-service OrdersController.list` — negative offset | Throws `BadRequestException` | Verified in contract spec | Pass |
| U-22 | `order-service OrdersController.list` — returns pagination meta | `orders[]` + `pagination{limit,offset,total}` | Verified in contract spec | Pass |

### Contract

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| C-01 | `GET /v1/orders?accountId=` response shape | `{ orders: OrderResponseDto[], pagination: { limit, offset, total } }` | Pass |
| C-02 | `orders.controller.contract.spec.ts` — all 26 contract scenarios | All pass | Pass (129 tests) |
| C-03 | `PaginationMetaV1`, `OrdersPageV1`, `GetWatchlistQueryV1` types exported from `@pulsedesk/contracts` | Available at compile time | Pass (build passes) |

### Security

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| SEC-01 | `GET /api/v1/positions` without JWT sub | `401 UnauthorizedException` | Pass |
| SEC-02 | `GET /api/v1/positions` — accountId always derived from JWT sub | No accountId query param accepted | Pass (IDOR eliminated) |
| SEC-03 | `GET /api/v1/orders?accountId=other-acc` with JWT sub=acc-001 | `403 ForbiddenException` | Pass (pre-existing) |

### Performance / Reliability

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| PERF-01 | Watchlist cache TTL | TTL set to 1 s (EX 1 in Redis SET) | Pass (U-07) |
| PERF-02 | Cache fail-open on Redis error | Live data served | Pass (U-06, U-08) |
| PERF-03 | Orders pagination max=200 enforced | `limit > 200` → 400 | Pass (U-20) |

---

## Coverage — Changed Modules

| Service | File | Lines | Branches | Gate |
|---------|------|-------|----------|------|
| api-gateway | `watchlist-cache.port.ts` | 100% | 100% | ✅ |
| api-gateway | `valkey-watchlist-cache.adapter.ts` | 100% | 100% | ✅ |
| api-gateway | `watchlist.controller.ts` | 100% | 100% | ✅ |
| api-gateway | `positions.controller.ts` | 100% | 100% | ✅ |
| api-gateway | `orders.controller.ts` | 100% | 100% | ✅ |
| order-service | `get-orders.use-case.ts` | 100% | 100% | ✅ |
| order-service | `orders.controller.ts` | 95.74% | 100% | ✅ |
| order-service | `order-repository.port.ts` | 100% | 100% | ✅ |
| order-service | `prisma-order.repository.ts` | 0% | 0% | ⚠️ see note |
| market-data | `get-watchlist.use-case.ts` | 100% | 100% | ✅ |
| market-data | `watchlist.controller.ts` | 100% | 100% | ✅ |

**Note on `prisma-order.repository.ts` (0%):** This file requires a live PostgreSQL connection for integration testing. The 0% coverage is pre-existing across all Prisma repository files in this project (not a regression from this task). The pagination logic added in `findAllByAccount` is validated indirectly through the use-case + controller contract tests. An integration test suite (requiring compose stack) would be the appropriate vehicle for direct repository coverage — deferred to a future milestone.

---

## Build and Lint

| Check | Result |
|-------|--------|
| `pnpm build` | ✅ Pass |
| `pnpm lint` | ✅ Pass (no errors) |
| `pnpm test` (329 tests / 56 suites) | ✅ All pass |

---

## AC Verification

| AC | Evidence | Status |
|----|----------|--------|
| Gateway exposes aggregated read endpoints for watchlist, orders, and positions | `GET /api/v1/watchlist`, `GET /api/v1/orders`, `GET /api/v1/positions` all present; positions route fixed to `/v1/positions/:accountId` | ✅ |
| Pagination/filtering contracts are stable and documented | `PaginationMetaV1`, `OrdersPageV1`, `GetOrdersQueryV1` in `@pulsedesk/contracts`; `status/limit/offset` validated in order-service controller | ✅ |
| Caching strategy for hot read paths is implemented (Valkey where appropriate) | `ValkeyWatchlistCacheAdapter` with 1 s TTL, fail-open; positions/orders serve live data; ADR-M5-T1 documents rationale | ✅ |

---

## Verdict: PASS
