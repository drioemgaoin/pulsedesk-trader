# Threat Model — Market Data Service (Tick Ingestion and Simulation)

- **TM ID:** `TM-M2-T2-market-data-service`
- **Date:** `2026-03-09`
- **Last reviewed:** `2026-03-09`
- **Status:** `active`
- **Owner:** `@sec`
- **Related milestone/task:** M2-T2

---

## Scope

- **In scope:** `market-data-service` — tick simulation, external tick ingestion (`POST /ticks`), watchlist (`GET /watchlist`), metrics (`GET /metrics`), in-memory tick store.
- **Out of scope:** Kafka publishing (M2-T3), downstream consumers, API Gateway auth layer.

---

## Architecture Overview

The market-data-service is a purely internal service (no host port binding). It:
- Runs a `TickSimulatorService` that emits price ticks on a 500ms interval for configured symbols
- Exposes `POST /ticks` for external tick injection (testing / feed adapter use)
- Exposes `GET /watchlist` returning the latest snapshot per symbol
- Exposes `GET /metrics` for Prometheus scraping
- Stores ticks in an in-memory `Map<symbol, Tick>` (one entry per symbol, overwritten on upsert)

**Trust boundary:** All endpoints are internal-network-only (no host port in Docker Compose). `GET /watchlist` is proxied via the API Gateway (JWT enforced externally). `POST /ticks` is guarded by `InternalApiKeyGuard` when `INTERNAL_TICK_API_KEY` is set.

---

## STRIDE Threat Analysis

| ID | Category | Threat | Asset at risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|---|---|
| T01 | Tampering | Unauthenticated internal caller poisons tick store via `POST /ticks` | Market data integrity | Low | High | `InternalApiKeyGuard`: requires `X-Api-Key` header when `INTERNAL_TICK_API_KEY` is set | Mitigated (key must be set in non-dev envs) |
| T02 | Tampering | Malformed tick payload bypasses validation and corrupts store | Market data integrity | Low | Medium | `Tick.create()` validates all fields (type, range, bid≤ask, finite numbers); rejects with 400 | Mitigated |
| T03 | Denial of Service | Unbounded symbol injection via `POST /ticks` grows in-memory store without limit | Memory / service availability | Low | Medium | Root cause mitigated by T01 (auth gate). Symbol count limit not yet enforced. | Open |
| T04 | Information Disclosure | `GET /watchlist` exposes live market data without per-request auth | Market data confidentiality | Low | Low | Network isolation (no host port); API Gateway enforces JWT for external access | Mitigated (network boundary) |
| T05 | Information Disclosure | `GET /metrics` exposes tick rate and volume data | Operational data | Info | Info | Internal-only, standard Prometheus scrape pattern; acceptable | Accepted |
| T06 | Information Disclosure | Error messages in `POST /ticks` 400 response expose validation detail | None sensitive | Info | Info | Error messages are fixed strings from validation code — no user data interpolated | Accepted |
| T07 | Denial of Service | Wildcard CORS (`*`) allows cross-origin requests if service ever gains browser-facing endpoints | Future browser clients | Low | Low | `CORS_ORIGIN` explicitly set in docker-compose; production startup throws if wildcard used with `NODE_ENV=production` | Mitigated |

---

## Open Risks

| ID | Threat | Owner | Target date |
|---|---|---|---|
| T03 | No maximum symbol count enforced on `POST /ticks` | @dev | M2-T3 or M3 |

---

## Mitigations Implemented

- `InternalApiKeyGuard` on `POST /ticks` (S2-01 fix)
- `Tick.create()` validates all fields with strict type/range/relationship checks
- `CORS_ORIGIN` explicitly set; production startup guard throws on wildcard
- Network isolation: no host port binding on any market-data-service endpoint
- Rejection counter (`market_tick_rejected_total`) tracks validation failures
- SIGTERM → graceful shutdown → tick simulator stopped cleanly

---

## Assumptions

- Docker network provides sufficient isolation; service is not reachable from outside the compose network
- `INTERNAL_TICK_API_KEY` will be set to a non-empty secret in any shared or production environment
- `POST /ticks` is a test/feed-adapter endpoint, not a general public API

---

## References

- Security findings: M2 milestone Notes (S2-01 through S2-07)
- OWASP API Security Top 10: API4 (Unrestricted Resource Consumption), API8 (Security Misconfiguration)
