# ADR-M1-T2 — Docker Compose local stack topology (PostgreSQL, Valkey, Kafka KRaft)

- **ADR ID:** `ADR-M1-T2-compose-local-stack`
- **Date:** `2026-03-09`
- **Status:** `accepted`
- **Owner:** `@devops`
- **Related milestone/task:** M1-T2
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** Define the local development infrastructure stack that closely mirrors production: relational DB, cache, message broker, observability stack — all runnable from a single `docker compose up --build`.
- **Constraints:** All images must be free and self-hostable. Must run on a developer laptop (Apple Silicon + x86). Services must start in dependency order with health checks. Graceful shutdown must be supported.
- **Assumptions:** Local profile only. Distributed production topology addressed in a later milestone.

---

## Decision

- **Chosen approach:** Docker Compose with 16 services: PostgreSQL 16-alpine, Valkey 7.2 (Redis-compatible), Kafka 3.7.1 KRaft (single-node, no ZooKeeper), OTel Collector, Prometheus, Loki, Tempo, Grafana, 7 app services, trader-ui. Startup order enforced via `depends_on` with `condition: service_healthy`.
- **Scope:** Local dev and CI compose smoke test.
- **Non-goals:** Production Kubernetes manifests, multi-broker Kafka cluster.

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| Redis instead of Valkey | Widely known | Redis 7.4+ changed to SSPL (non-OSS) license | Valkey is the community fork, BSD-licensed, API-compatible |
| Kafka with ZooKeeper | Battle-tested | Requires extra ZooKeeper container, more complex setup | KRaft mode is stable since Kafka 3.3, removes ZooKeeper dependency |
| Redpanda instead of Kafka | Kafka-compatible, faster startup | Not the production target; diverges from real Kafka behavior | Stick with real Kafka to avoid hidden compatibility gaps |
| Docker Compose profiles | Selective service startup | Adds complexity; all services needed for full integration tests | Keep it simple at M1; profiles can be added if startup time becomes an issue |

---

## Consequences

- **Positive:** Single command (`docker compose up --build`) starts full platform. Health checks ensure correct startup order. Graceful shutdown tested (`stop_signal: SIGTERM`, `stop_grace_period: 30s > 25s service timeout`).
- **Negative:** Cold start takes ~60s on first pull. Kafka KRaft single-node has no replication.
- **Risks:** IPv6 vs IPv4 resolution — `localhost` resolves to `::1` in Alpine containers but Fastify binds IPv4 by default. Fixed: all health checks use `127.0.0.1` explicitly.
- **Risk mitigations:** Health check bugs caught during QA live run (T2 validation). `kafka-topics.sh` path fixed to `/opt/kafka/bin/kafka-topics.sh`.

---

## Implementation and Migration

- `infrastructure/` holds: `prometheus.yml`, `otel-collector.yml`, `tempo.yml`, `grafana/datasources.yml`.
- `.env.example` documents all required vars. `.dockerignore` excludes `node_modules`, `dist`, `.env`, `.git`, `.claude`.
- Dockerfiles use pnpm workspace pattern with `--filter` for targeted builds.

---

## Impact Assessment

- **Reliability:** `depends_on` + `condition: service_healthy` prevents race conditions at startup. SIGTERM + 30s grace period covers service drain window.
- **Observability:** OTel Collector, Prometheus, Loki, Tempo, Grafana all wired from M1 — no retrofitting needed.
- **Licensing:** PostgreSQL (PostgreSQL License), Valkey (BSD-3), Kafka (Apache 2.0), all observability tools (Apache 2.0 / AGPL) — all free and self-hostable.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit
- [x] Approval recorded (`@devops`)
