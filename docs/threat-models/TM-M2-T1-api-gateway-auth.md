# Threat Model — API Gateway Authentication and Routing

- **TM ID:** `TM-M2-T1-api-gateway-auth`
- **Date:** `2026-03-09`
- **Last reviewed:** `2026-03-09`
- **Status:** `active`
- **Owner:** `@sec`
- **Related milestone/task:** M2-T1

---

## Scope

- **In scope:** API Gateway (`api-gateway`) — JWT authentication, rate limiting, request proxying to upstream services, token issuance endpoint.
- **Out of scope:** Upstream services' internal logic, Kafka event bus, database access.

---

## Architecture Overview

The API Gateway is the single external entry point. It:
- Issues JWT tokens via `POST /api/v1/auth/token` (demo credentials from env vars)
- Validates JWT on all routes except `/health`, `/ready`, `/metrics`, `/api/v1/auth/token`
- Enforces rate limits (100 req/60s) backed by Valkey
- Proxies authenticated requests to `order-service`, `portfolio-service`, `market-data-service`
- Propagates `x-request-id` and W3C `traceparent` to upstreams

**Trust boundary:** External clients → Gateway (JWT validated) → Internal Docker network (no per-request auth on upstreams).

---

## STRIDE Threat Analysis

| ID | Category | Threat | Asset at risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|---|---|
| T01 | Spoofing | Attacker forges JWT with known/weak secret | All protected routes | Low | High | `JWT_SECRET` must be strong and env-injected; startup fails if absent; documented "change in prod" | Mitigated |
| T02 | Spoofing | Brute-force on `POST /auth/token` with credential stuffing | Demo credentials | Medium | Medium | Rate limiting (100 req/60s per IP) on unauthenticated routes | Mitigated |
| T03 | Tampering | Attacker modifies proxied request body between gateway and upstream | Order data integrity | Low | High | Internal Docker network only; no external route to upstreams; TLS for distributed deployment | Open (TLS deferred) |
| T04 | Repudiation | No audit log for token issuance | Auth accountability | Medium | Low | `x-request-id` and structured Pino logs capture all requests including auth endpoint | Mitigated |
| T05 | Information Disclosure | JWT payload exposes user identity claims | User identity | Low | Low | JWT payload is not encrypted (only signed); avoid sensitive claims beyond `sub` | Mitigated |
| T06 | Information Disclosure | Error responses leak upstream service details | Internal topology | Low | Low | `ProxyService` maps upstream errors transparently; `BadGatewayException` hides internal detail | Mitigated |
| T07 | Denial of Service | Rate limit bypass via IP spoofing (`X-Forwarded-For`) | Gateway availability | Medium | Medium | Authenticated requests key on `req.user.sub` (not IP-spoofable); anonymous requests key on IP | Partially mitigated |
| T08 | Denial of Service | Slow upstream causes gateway thread exhaustion | Gateway availability | Medium | High | 10s upstream timeout in `ProxyService`; `BadGatewayException` returned immediately on timeout | Mitigated |
| T09 | Elevation of Privilege | Attacker accesses upstream services directly by bypassing gateway | All upstreams | Low | High | Upstreams have no host port binding in Docker Compose; internal network only | Mitigated (network isolation) |

---

## Open Risks

| ID | Threat | Owner | Target date |
|---|---|---|---|
| T03 | No TLS between gateway and upstreams in distributed deployment | @devops | M8 (hardening) |
| T07 | IP spoofing on anonymous rate limit path | @arch | M8 (hardening) |

---

## Mitigations Implemented

- JWT validation on all routes via global `JwtAuthGuard` — `@Public()` scope minimal and explicit
- Rate limiting: 100 req/60s per identity (sub) or IP, backed by Valkey (distributed, survives restart)
- Demo token issuer uses env-injected credentials (`DEMO_USERNAME`/`DEMO_PASSWORD`)
- `x-request-id` correlation and structured Pino logs on all requests
- 10s upstream timeout prevents gateway hang
- Upstreams not exposed on host ports

---

## Assumptions

- Docker network provides sufficient isolation for internal service communication in local/dev environment
- `JWT_SECRET` will be replaced with a strong random value before any shared/production deployment
- Demo credential issuer (`POST /auth/token`) will be replaced with a real IdP before production

---

## References

- Related ADR: `docs/adr/ADR-M2-T1-gateway-auth-rate-limiting.md`
- OWASP API Security Top 10: API1 (Broken Object Level Authorization), API2 (Broken Authentication), API4 (Unrestricted Resource Consumption)
