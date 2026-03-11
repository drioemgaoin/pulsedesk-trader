# ADR-M5-T1: Valkey Cache-Aside for Watchlist Hot Read Path

- **Date:** 2026-03-11
- **Status:** accepted
- **Deciders:** @arch

## Context

The Trader UI polls `GET /api/v1/watchlist` on every tick cycle (planned: every 1–2 s per connected client). Under load this translates to O(clients) queries per second hitting the market-data-service in-memory tick store through the gateway. Valkey is already deployed as the throttle storage backend in the api-gateway.

## Decision

Add a **cache-aside read layer** for `GET /api/v1/watchlist` responses in the api-gateway:

- Location: `api-gateway/src/infrastructure/cache/WatchlistCacheAdapter` behind port `IWatchlistCache`.
- TTL: **1 second** — market data is time-sensitive; stale beyond 1 s is misleading.
- Failure mode: **fail-open** — on Valkey error, serve live data from downstream. No circuit breaker on cache reads.
- Cache key: `watchlist:snapshot` (global; per-symbol filtered views are not cached separately).
- Metrics: `watchlist_cache_hits_total` / `watchlist_cache_misses_total`.

Do **not** cache positions or orders — PnL accuracy and order state consistency outweigh any latency benefit.

## Rationale

- Valkey is already in the gateway dependency set; no new infrastructure needed.
- Cache TTL = poll interval → near-zero read fan-out to market-data-service at steady state.
- Fail-open preserves liveness without adding ioredis as a critical-path dependency for reads.

## Consequences

- UI may see watchlist data up to 1 s old. Acceptable for non-execution display path.
- Positions and orders always return live data — no consistency caveats.
- Cache invalidation strategy (push on tick ingestion) is deferred; TTL-based eviction is sufficient for M5.
