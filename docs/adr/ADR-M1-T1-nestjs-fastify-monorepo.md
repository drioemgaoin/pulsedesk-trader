# ADR-M1-T1 — NestJS + Fastify, pnpm monorepo, clean architecture, shared contracts

- **ADR ID:** `ADR-M1-T1-nestjs-fastify-monorepo`
- **Date:** `2026-03-09`
- **Status:** `accepted`
- **Owner:** `@arch`
- **Related milestone/task:** M1-T1
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** Choose the backend framework, transport adapter, workspace strategy, architecture pattern, and inter-service contract mechanism for a multi-service trading platform that must run locally via Docker Compose and scale to a distributed deployment.
- **Constraints:** All tooling must be free and self-hostable. TypeScript across frontend and backend. Strong typing for inter-service contracts. Clean separation of concerns from day one to avoid future refactoring cost.
- **Assumptions:** Seven backend services sharing common patterns. One SPA frontend. Event-driven communication via Kafka in later milestones.
- **What will fail if no decision is made:** Each service would adopt different conventions, making cross-service consistency, testing, and observability retrofitting expensive.

---

## Decision

- **Chosen approach:** NestJS v11 with `@nestjs/platform-fastify` adapter, pnpm workspaces monorepo (`apps/`, `services/`, `packages/`), clean architecture layering (`domain/`, `application/`, `infrastructure/`, `interfaces/`), shared `@pulsedesk/contracts` package for API and event types.
- **Scope:** All seven backend services + trader-ui SPA.
- **Non-goals:** Service mesh, distributed tracing beyond OTel bootstrap, production deployment topology.

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| NestJS + Express | Familiar, large ecosystem | Slower than Fastify (~2x throughput), less suitable for high-frequency tick data | Performance matters for market data path |
| Fastify standalone (no NestJS) | Maximum control, minimal overhead | No DI, no decorator-based module system, higher boilerplate | NestJS DI + module system pays off across 7 services |
| npm/yarn workspaces | Widely used | Slower installs, weaker workspace isolation | pnpm is faster, stricter hoisting, better for monorepo |
| Lerna/Nx monorepo tooling | Build caching, affected-only runs | Added complexity, licensing concerns for advanced features | Overkill at this stage; can adopt later |
| Feature-based folder structure | Colocation of related files | Blurs domain/infra boundaries, harder to enforce dependency rules | Clean architecture boundaries are non-negotiable for testability |

---

## Consequences

- **Positive:** Consistent DI, module system, and lifecycle across all services. Fastify gives ~2x throughput over Express. Monorepo enables shared contracts with full type safety. Clean arch enforces testable, framework-independent domain logic.
- **Negative:** NestJS decorator/DI magic can be opaque. Fastify has a smaller plugin ecosystem than Express.
- **Risks:** NestJS DI with Symbol-based injection tokens requires care (seen in TickMetricsService constructor issue).
- **Risk mitigations:** Established convention: always use `@Inject(TOKEN)` for Symbol-based tokens; `tsconfig.json` excludes spec files from build but includes them for IDE.

---

## Implementation and Migration

- Scaffold command: `pnpm dlx @nestjs/cli new services/<name> --package-manager pnpm --strict --skip-git`
- Each service exposes `/health`, `/ready`, `/metrics` from day one.
- `packages/contracts` holds versioned DTOs (API v1) and Kafka event interfaces.

---

## Impact Assessment

- **Clean architecture:** Enforced by convention — `domain/` has no framework imports, `application/` depends only on `domain/`, `infrastructure/` implements ports.
- **Reliability:** Graceful shutdown via `enableShutdownHooks()` + readiness flip + 25s hard timeout on all services.
- **Security:** Fastify Helmet applied globally; CORS restricted by `CORS_ORIGIN` env var.
- **Observability:** Pino structured logging + OTel auto-instrumentation bootstrapped at scaffold time.
- **Performance:** Fastify adapter measured at ~2x throughput vs Express for tick ingestion path.
- **Licensing:** NestJS (MIT), Fastify (MIT), pnpm (MIT) — all free and self-hostable.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit
- [x] Approval recorded (`@arch`)
