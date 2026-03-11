# DESIGN-M5-T1: Read Model APIs for UI Consumption

**Task:** M5-T1
**Date:** 2026-03-11
**Status:** DESIGNED

---

## Task

```
Task: M5-T1
Components impacted:
  - packages/contracts — new query/pagination types
  - services/api-gateway — positions IDOR fix, orders pagination, watchlist symbol filter, Valkey cache
  - services/order-service — status/pagination query params on GET /v1/orders
  - services/portfolio-service — no change (route fix is in gateway proxy URL)
  - services/market-data-service — symbols filter on GET watchlist
Stack compliance: follows baseline | ADR required for Valkey read caching
```

---

## Current State Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| Positions route mismatch: gateway proxies `/positions` but portfolio-service expects `/v1/positions/:accountId` | BLOCKER | api-gateway `positions.controller.ts` |
| Positions no IDOR guard: any authenticated user can retrieve any accountId's positions | HIGH (security) | api-gateway `positions.controller.ts` |
| Orders list no pagination: GET `/orders?accountId=` returns unbounded rows | MEDIUM | order-service + contracts |
| Orders list no status filter | LOW | order-service |
| Watchlist no symbol filtering: always returns full tick state | LOW | market-data-service |
| No Valkey cache on hot read paths: every UI poll hits PostgreSQL/in-memory directly | MEDIUM (perf) | api-gateway + services |

---

## Proposed Approach

### 1. Contracts (`packages/contracts/src/api/v1/`)

New types:

```typescript
// Pagination meta (reusable)
export interface PaginationMetaV1 {
  limit: number;
  offset: number;
  total: number;
}

// Orders list query params
export interface GetOrdersQueryV1 {
  accountId: string;
  status?: 'PENDING' | 'ACCEPTED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  limit?: number;   // default 50, max 200
  offset?: number;  // default 0
}

// Paginated orders response (replaces bare OrderResponseV1[])
export interface OrdersPageV1 {
  orders: OrderResponseV1[];
  pagination: PaginationMetaV1;
}

// Watchlist query params
export interface GetWatchlistQueryV1 {
  symbols?: string[];  // comma-separated in URL: ?symbols=AAPL,TSLA
}
```

`WatchlistResponseV1` — no shape change; gateway filters quotes client-side after cache read.

### 2. Positions Fix (api-gateway)

- **Route**: `ProxyService.forward(req, '/v1/positions/${jwt.sub}', 'GET')` — derive accountId from JWT `sub`, not a query param.
- **IDOR**: No explicit query param — accountId is always the JWT subject. Same guarantee as orders.
- **Controller signature**: `GET /api/v1/positions` — no params; gateway injects `req.user.sub`.

### 3. Orders Pagination (order-service + gateway)

**order-service** `GET /v1/orders`:
- Accept `status`, `limit` (max 200, default 50), `offset` (default 0).
- Prisma query: `findMany` with `where: { accountId, status? }`, `take: limit`, `skip: offset`, plus `count` for total.
- Return `OrdersPageV1`.

**api-gateway** `GET /api/v1/orders`:
- Forward `status`, `limit`, `offset` from query string to order-service.
- Response contract: `OrdersPageV1`.

### 4. Watchlist Symbol Filter (market-data-service + gateway)

**market-data-service** `GET /watchlist`:
- Accept optional `symbols` query param (comma-separated string).
- Filter in-memory tick map before returning `WatchlistResponseV1`.

**api-gateway** `GET /api/v1/watchlist`:
- Forward `symbols` query param as-is.

### 5. Valkey Cache Strategy

Cache-aside on **watchlist only**:

| Endpoint | Cache? | TTL | Key pattern | Invalidation |
|----------|--------|-----|------------|--------------|
| `GET /api/v1/watchlist` | YES | 1 s | `watchlist:snapshot` | TTL-based; write-through on every tick ingestion is out of scope for M5 |
| `GET /api/v1/positions` | NO | — | — | PnL accuracy requires live DB read |
| `GET /api/v1/orders` | NO | — | — | Order status changes immediately after events |

**Cache implementation location**: `api-gateway` infrastructure adapter — `WatchlistCacheAdapter` wraps `IoRedis` (already used for throttle storage). Cache miss → proxy to market-data-service → store result → return. On cache hit → return without downstream call.

**ADR**: This introduces a read-path caching behavior in the gateway; ADR-M5-T1 documents the decision.

---

## Reliability / Security Implications

- Positions IDOR fix is a security fix and must be delivered before any watchlist/pagination work.
- Cache TTL of 1 s means UI sees at most 1 s stale watchlist; acceptable for non-trading display path.
- Cache miss path must not add latency > 5 ms (ioredis GET is < 1 ms locally); circuit breaker on Valkey is not required for reads — fail-open (serve live data on Valkey error).
- Orders `limit` max of 200 prevents unbounded PostgreSQL scan; enforced in order-service with `class-validator` `@Max(200)`.

## Clean Architecture Layering

- `WatchlistCacheAdapter` lives in `api-gateway/src/infrastructure/cache/`.
- Port interface `IWatchlistCache` lives in `api-gateway/src/application/cache/`.
- `ProxyService` or a new `ReadQueryService` in `application/` calls the cache port — never imports ioredis directly.
- order-service: `GetOrdersUseCase` accepts `GetOrdersQueryV1` DTO; Prisma call stays in `infrastructure/persistence/`.

## Graceful Shutdown

- No new long-lived connections beyond ioredis (already connected). No shutdown change required.

## Observability

- Cache hit/miss counter: `watchlist_cache_hits_total`, `watchlist_cache_misses_total` (Prometheus counter via `prom-client`).
- Span added to cache read path; cache hit sets `cache.hit=true` on span.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Positions IDOR was shipping silently | Fix gate-checked in @sec review before @pm acceptance |
| Valkey cache cold-start on first poll returns live data | Acceptable; TTL-based design has no warm-up dependency |
| Pagination `total` count adds a second DB query per request | Use Prisma `$transaction([findMany, count])` — single round-trip to PG |
| symbols filter grows unbounded (DoS: send 500 symbols) | Max 50 symbols enforced in market-data-service DTO with `@ArrayMaxSize(50)` |

---

## Recommendation: PROCEED
