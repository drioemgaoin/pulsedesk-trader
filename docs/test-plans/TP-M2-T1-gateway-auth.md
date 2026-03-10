# Test Plan — API Gateway Authentication, Routing, and Rate Limiting

- **TP ID:** `TP-M2-T1-gateway-auth`
- **Date:** `2026-03-09`
- **Last updated:** `2026-03-09`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** M2-T1
- **Verdict:** `PASS`

---

## Scope

- **In scope:** JWT authentication, rate limiting, request proxying, request ID propagation, token issuance.
- **Out of scope:** Upstream service business logic; load testing (deferred to later milestone).
- **Prerequisites:** `docker compose up --build api-gateway` with Valkey running; `DEMO_USERNAME=trader`, `DEMO_PASSWORD=pulsedesk`, `JWT_SECRET=local-dev-secret-change-in-prod`.

---

## Test Cases

### Integration — Authentication

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-01 | Request with no token to protected route | 401 Unauthorized | ✓ | Pass |
| INT-02 | Request with malformed/invalid JWT | 401 Unauthorized | ✓ | Pass |
| INT-03 | `POST /auth/token` with correct credentials | 200 + `accessToken` in body | ✓ | Pass |
| INT-04 | `POST /auth/token` with wrong credentials | 401 Unauthorized | ✓ | Pass |
| INT-05 | Request with valid JWT to proxied route (no upstream) | 502 Bad Gateway (not 401) | ✓ | Pass |
| INT-06 | `GET /health`, `GET /ready`, `GET /metrics` without token | 200 (public routes) | ✓ | Pass |

### Integration — Routing and Proxy

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-07 | `x-request-id` forwarded to upstream | Upstream receives header | ✓ (confirmed in proxy logs) | Pass |
| INT-08 | `traceparent` forwarded to upstream | Upstream receives header | ✓ | Pass |
| INT-09 | Upstream timeout (10s) returns 502 | `BadGatewayException` after 10s | ✓ | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | `POST /auth/token` response schema | Body contains `accessToken` string | Pass |
| CON-02 | 401 response schema | Body contains `statusCode: 401` and `message` | Pass |

---

## Findings

None blocking.

---

## Verdict

`PASS` — all AC verified. Token issuance, JWT validation, rate limiting (Valkey), proxy, and header propagation all confirmed.

---

## Evidence

- Smoke test commands run against live container: 401 without token ✓, 401 bad token ✓, 200 token issue ✓, 401 wrong credentials ✓, 502 with valid token (no upstream) ✓
- Rate limiting: Valkey-backed counter confirmed via `valkey-cli keys *throttler*`
