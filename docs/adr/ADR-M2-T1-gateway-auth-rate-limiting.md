# ADR-M2-T1 — API Gateway authentication strategy and rate limiting

- **ADR ID:** `ADR-M2-T1-gateway-auth-rate-limiting`
- **Date:** `2026-03-09`
- **Status:** `accepted`
- **Owner:** `@arch`
- **Related milestone/task:** M2-T1
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** The API Gateway needs to authenticate all inbound requests, enforce per-identity rate limits, and proxy to upstream services — without coupling upstream services to auth logic.
- **Constraints:** Auth must be stateless (no session store for token validation). Rate limiting must be distributed (survive gateway restart). All tooling free and self-hostable.
- **Assumptions:** Services communicate internally over Docker network. External access goes exclusively through the gateway.

---

## Decision

- **Authentication:** `@nestjs/passport` + `passport-jwt`. `JwtAuthGuard` applied globally via `APP_GUARD`. `@Public()` decorator exempts `/health`, `/ready`, `/metrics`, `/api/v1/auth/token`. Demo token issuer at `POST /api/v1/auth/token` (credentials from `DEMO_USERNAME`/`DEMO_PASSWORD` env vars).
- **Rate limiting:** `@nestjs/throttler` + `@nest-lab/throttler-storage-redis` (ioredis → Valkey). `IdentityThrottleGuard` keys on `req.user.sub` (authenticated) or client IP (anonymous). Default: 100 req / 60s.
- **Request tracing:** Fastify `onRequest` hook generates `x-request-id` (UUID v4) if absent; echoed in response. `traceparent` forwarded to upstreams.
- **Proxy:** `ProxyService` forwards `x-request-id` + `traceparent`; 10s upstream timeout; maps upstream 4xx/5xx transparently; `BadGatewayException` on timeout.
- **Scope:** API Gateway service only. Upstream services rely on network isolation, not per-request auth.
- **Non-goals:** OAuth2/OIDC, refresh tokens, per-route quota customisation.

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| Session-based auth | Familiar | Stateful, requires session store, not suitable for distributed deployment | JWT is stateless and scales horizontally |
| API key auth only | Simple | No user identity in token, harder to extend to roles/scopes | JWT supports claims; easier path to RBAC |
| In-memory rate limiting | Zero deps | Resets on gateway restart, not distributed | Valkey already in stack; distributed rate limiting costs nothing extra |
| Kong / Nginx as gateway | Mature, feature-rich | Heavyweight, requires separate config management, deviates from NestJS ecosystem | NestJS gateway keeps stack homogeneous and testable |

---

## Consequences

- **Positive:** Stateless auth scales horizontally. Rate limits survive gateway restart. All upstream services are auth-agnostic (trust is the internal network).
- **Negative:** Demo token issuer (`DEMO_USERNAME`/`DEMO_PASSWORD`) is not suitable for production — must be replaced with a real identity provider before production deployment.
- **Risks:** JWT secret misconfiguration could open all routes. Mitigated: startup fails if `JWT_SECRET` is absent.
- **Risk mitigations:** `JWT_SECRET` documented as required in `.env.example` with a clear "change in prod" note.

---

## Implementation and Migration

- **Required updates:** `JWT_SECRET`, `JWT_EXPIRY_SECONDS`, `DEMO_USERNAME`, `DEMO_PASSWORD` in `.env.example` and `docker-compose.yml`.
- **Migration to real IdP:** Replace `POST /api/v1/auth/token` with OIDC token exchange. `JwtAuthGuard` remains unchanged (validates JWT regardless of issuer).
- **Rollback:** Remove `APP_GUARD` registration to disable auth globally; revert rate limiting by removing `ThrottlerModule`.

---

## Impact Assessment

- **Security:** All routes protected by default. Rate limiting prevents brute-force and abuse. `@Public()` scope is minimal and explicit.
- **Reliability:** `ProxyService` 10s timeout prevents gateway hang on upstream failure. `BadGatewayException` provides clear error to clients.
- **Observability:** `x-request-id` and `traceparent` propagated to all upstreams — correlated traces across services from M2.
- **Licensing:** `@nestjs/passport` (MIT), `passport-jwt` (MIT), `@nestjs/throttler` (MIT), `@nest-lab/throttler-storage-redis` (MIT) — all free.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit
- [x] Approval recorded (`@arch`)
