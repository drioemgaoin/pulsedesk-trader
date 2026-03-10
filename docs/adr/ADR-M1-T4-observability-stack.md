# ADR-M1-T4 — Observability stack (OpenTelemetry, Pino, W3C traceparent, correlation IDs)

- **ADR ID:** `ADR-M1-T4-observability-stack`
- **Date:** `2026-03-09`
- **Status:** `accepted`
- **Owner:** `@devops`
- **Related milestone/task:** M1-T4
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** Wire traces, structured logs, and metrics across all seven backend services from the start, so every future feature ships with observability already working — rather than retrofitting it later.
- **Constraints:** All tooling free and self-hostable. Must support distributed trace context propagation across services. Must produce JSON-structured logs in production and human-readable output in dev.
- **Assumptions:** OTel Collector + Prometheus + Loki + Tempo + Grafana are available in Docker Compose (established in M1-T2).

---

## Decision

- **Chosen approach:**
  - **Tracing:** `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` with `OTLPTraceExporter` (HTTP → `otel-collector:4318`). Bootstrapped in `src/instrumentation.ts`, loaded via `--require` in Dockerfile CMD. `fs` auto-instrumentation disabled (noise).
  - **Logging:** `nestjs-pino` + `pino-pretty` (dev only). `LoggerModule.forRoot` in each `AppModule`. W3C `traceparent` fields (`trace_id`, `span_id`, `trace_flags`) automatically injected into every log line.
  - **Correlation IDs:** `onRequest` Fastify hook in api-gateway reads `x-request-id` header or generates UUID; echoed back in response header.
  - **Metrics:** Prometheus scrape endpoints (`GET /metrics`) on all services. Full metrics implementation deferred to per-service milestones.
- **Scope:** All seven backend services.
- **Non-goals:** Custom span instrumentation (beyond auto), alerting rules, SLO definitions.

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| Winston logging | Widely used | No native pino-http request logging, heavier than Pino | Pino is fastest Node.js logger, nestjs-pino has first-class NestJS support |
| Jaeger instead of Tempo | Mature, purpose-built tracing UI | Requires separate deployment, Grafana already in stack | Tempo integrates natively with Grafana Loki for correlated log+trace queries |
| Manual OTel span creation only | Full control | High boilerplate, easy to miss instrumentation points | Auto-instrumentation covers HTTP, gRPC, DB drivers automatically |
| Datadog / New Relic | Polished UX | SaaS, mandatory paid service | Violates self-hostable constraint |

---

## Consequences

- **Positive:** Every request automatically gets `trace_id`/`span_id` in logs. Cross-service traces correlated via W3C `traceparent` header propagation. No future service needs to retrofit observability.
- **Negative:** OTel SDK adds ~50ms to cold start per service. `--require` in Dockerfile CMD must come before `dist/main.js`.
- **Risks:** Auto-instrumentation can produce noisy spans (e.g. `fs` module). Mitigated by disabling `fs` instrumentation explicitly.

---

## Impact Assessment

- **Observability:** Distributed traces, structured JSON logs, and Prometheus metrics available from M1. Grafana datasources pre-provisioned.
- **Performance:** Pino is the fastest Node.js logger. OTel HTTP exporter is async and non-blocking.
- **Licensing:** All OTel packages (Apache 2.0), Pino (MIT), nestjs-pino (MIT) — free and self-hostable.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit
- [x] Approval recorded (`@devops`)
