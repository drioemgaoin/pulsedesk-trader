# Security Review — Read Model APIs for UI Consumption

- **Review ID:** `SEC-M5-T1-read-model-apis`
- **Date:** 2026-03-11
- **Reviewer:** @sec
- **Related milestone/task:** M5-T1
- **Verdict:** APPROVE

---

## Scope

Changed components reviewed:

| File | Service |
|------|---------|
| `interfaces/http/positions.controller.ts` | api-gateway |
| `interfaces/http/orders.controller.ts` | api-gateway |
| `interfaces/http/watchlist.controller.ts` | api-gateway |
| `infrastructure/cache/valkey-watchlist-cache.adapter.ts` | api-gateway |
| `interfaces/http/orders.controller.ts` | order-service |
| `interfaces/http/watchlist.controller.ts` | market-data-service |

---

## Findings

### CRITICAL — none

### HIGH — none

### MEDIUM — resolved before approval

#### M-01 — IDOR on `GET /api/v1/orders/:id` and `POST /api/v1/orders/:id/cancel` (api-gateway) ✅ FIXED

- **OWASP:** API1:2023 — Broken Object Level Authorization
- **Description:** The `get` and `cancel` routes in api-gateway `orders.controller.ts` previously proxied without verifying that the authenticated JWT subject owned the target order UUID. A valid JWT holder who learned a foreign UUID could read its status or issue a cancel.
- **Fix:** Both routes now perform a fetch-then-verify pattern:
  1. Fetch the order from order-service
  2. Assert `order.accountId === jwtUser.sub`; throw `403 ForbiddenException` on mismatch
  3. Throw `401 UnauthorizedException` if no JWT user present
  - Cancel only proceeds to the second proxy call after ownership is confirmed
- **Tests added:** 401 (no JWT) and 403 (ownership mismatch) cases for both `get` and `cancel`

---

### LOW — resolved before approval

#### L-01 — User-controlled `status` value reflected in BadRequestException message (order-service) ✅ FIXED

- **OWASP:** API3:2023 — Information Exposure
- **Description:** `throw new BadRequestException(\`invalid status value: ${status}\`)` echoed the raw query parameter back to the caller. While not exploitable for injection, it reflects arbitrary user input into error messages.
- **Fix:** Replaced with a static enumeration of valid values: `status must be one of: PENDING, FILLED, CANCELLED, ...`

---

### INFO

#### I-01 — `encodeURIComponent` on JWT `sub` for positions path param

- **File:** `api-gateway/src/interfaces/http/positions.controller.ts:35`
- **Assessment:** Correct. Prevents path traversal if the identity provider issues a `sub` containing `/` or `..`.

#### I-02 — Symbol filter uses `Set<string>` with trimmed/uppercased input

- **File:** `api-gateway/src/interfaces/http/watchlist.controller.ts:46`
- **Assessment:** No injection risk. User-controlled string is only used for in-process set membership lookup against a cached upstream payload.

#### I-03 — Watchlist gated by `IdentityThrottleGuard`

- **Assessment:** Market data is appropriately user-agnostic within the authenticated perimeter. Correct posture.

#### I-04 — `lazyConnect: true` on Valkey client

- **Assessment:** Good defensive posture. Application starts even if Valkey is temporarily unavailable; cache degrades to live-proxy mode (fail-open).

#### I-05 — Redis cache JSON.parse without schema validation

- **Assessment:** Low residual risk. Redis is internal-only; no user-supplied data ever reaches the cache key or value. Acceptable given the trust boundary.

---

## Authorization Model

| Route | Auth enforcement | IDOR status |
|-------|-----------------|-------------|
| `GET /api/v1/positions` | JWT required; `accountId` = `jwtUser.sub` | Fixed (M5-T1) |
| `GET /api/v1/orders?accountId=` | JWT required; `accountId` must equal `jwtUser.sub` | Fixed (M5-T1) |
| `GET /api/v1/orders/:id` | JWT required; ownership verified via fetch-then-check | Fixed (M5-T1, M-01) |
| `POST /api/v1/orders/:id/cancel` | JWT required; ownership verified via fetch-then-check | Fixed (M5-T1, M-01) |
| `GET /api/v1/watchlist` | JWT required (throttle guard); market data is user-agnostic | Correct |

---

## Test Results

| Service | Suites | Tests |
|---------|--------|-------|
| api-gateway | 10 passed | 39 passed |
| order-service | 12 passed | 129 passed |

---

## Verdict: APPROVE

All MEDIUM and LOW findings resolved before approval. No CRITICAL or HIGH issues. Residual INFO items are acceptable given the internal trust boundaries.
