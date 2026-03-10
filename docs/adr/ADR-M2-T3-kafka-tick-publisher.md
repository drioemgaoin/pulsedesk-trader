# Architecture Decision Record

- **ADR ID:** `ADR-M2-T3-kafka-tick-publisher`
- **Title:** KafkaJS tick publisher with explicit partition assignment and idempotent producer
- **Date:** `2026-03-10`
- **Status:** `accepted`
- **Owner:** `@arch`
- **Related milestone/task:** M2-T3
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** The Market Data Service must replace `NullTickPublisher` with a real Kafka producer that publishes `MarketTickEvent` messages to the `market.ticks` topic. The producer must guarantee ordering per symbol partition and be resilient to transient broker failures.
- **Business/technical constraints:**
  - Kafka (KafkaJS) is the approved event backbone — no deviation.
  - `symbolPartitionKey(symbol, 10)` already computes a deterministic partition number 0–9 and is passed as the second argument to `ITickPublisher.publish(tick, partitionKey)`.
  - Event schema is already versioned via `tick.toMarketEvent()` → `MarketTickEvent` (`eventType: 'market.tick'`, `schemaVersion: 1`).
  - Unit tests must continue to work without a live Kafka broker (`NullTickPublisher` preserved for test/dev-no-broker mode).
  - Clean architecture: the publisher is an infrastructure adapter; domain and application layers must not change.
- **Assumptions:**
  - `KAFKA_BROKER` env var is present in production and compose; absent or empty means dev/test mode (null publisher).
  - Topic `market.ticks` is pre-created with 10 partitions (matching the partition key range 0–9). Kafka auto-create is acceptable in local profile as a fallback.
- **What will fail if no decision is made:** Market events never leave the service; downstream services (Notification, Portfolio, Risk) cannot consume real-time market data.

---

## Decision

- **Chosen option:** `KafkaTickPublisher` infrastructure adapter using KafkaJS, with **explicit partition assignment** (`partition: partitionKey`) rather than key-based Kafka hashing.
- **Scope:**
  - New `infrastructure/messaging/kafka-tick-publisher.ts` implementing `ITickPublisher`.
  - `AppModule` binds `KafkaTickPublisher` when `KAFKA_BROKER` is set; `NullTickPublisher` otherwise.
  - New `infrastructure/messaging/kafka-client.provider.ts` creates and exports the KafkaJS `Producer` as a NestJS custom provider.
  - Topic: `market.ticks`, 10 partitions.
  - Producer config: `idempotent: true`, `retry: { retries: 5, initialRetryTime: 100, maxRetryTime: 3000 }`, `acks: -1` (all ISR). KafkaJS enforces `maxInFlightRequests: 1` internally when idempotent is true.
  - Message format: JSON-serialized `MarketTickEvent`; headers include `eventType`, `schemaVersion`, `x-trace-id`.
  - Graceful shutdown: `KafkaTickPublisher` implements `OnModuleDestroy` → `producer.disconnect()`.
  - Consumer test utility: `test/helpers/kafka-consumer.helper.ts` — creates a transient KafkaJS consumer group, subscribes from earliest, collects N messages per timeout, returns them for assertions.
- **Non-goals:**
  - Outbox pattern (not required here — Market Data Service is stateless; tick events are fire-and-forget with at-least-once delivery acceptable).
  - Dead-letter topic (deferred to a reliability milestone).
  - Schema registry (Open Question 3 in PROJECT.md — repository-driven schema contracts used for now).

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| **Key-based routing** (pass `symbol` as Kafka message key, let KafkaJS hash) | Simpler producer code; Kafka-native | murmur2 hash distribution may differ from djb2 `symbolPartitionKey`; partition count coupling | We already compute a deterministic partition key; explicit assignment guarantees consistency with the existing `symbolPartitionKey` contract |
| **NestJS `@nestjs/microservices` Kafka transport** | Built-in DI integration | Opinionated consumer/producer coupling; harder to control idempotency/retry precisely; over-engineered for a pure producer | Raw KafkaJS gives full control over producer config and explicit partition assignment |
| **Outbox pattern** | Guarantees DB + event atomicity | Market Data Service has no DB writes; events are derived from in-memory simulation | Not applicable; adds unnecessary complexity |

---

## Consequences

- **Positive outcomes:**
  - Symbol ordering per partition guaranteed: all ticks for `AAPL` always land on the same partition regardless of producer instance count.
  - Idempotent producer prevents duplicate events on retry after leader election or transient failures.
  - `NullTickPublisher` preserved; unit tests and local dev without Kafka remain fully functional.
  - Clean port/adapter separation maintained; domain and application layers unchanged.
- **Negative outcomes:**
  - `KAFKA_BROKER` must be set correctly in compose and deployment; misconfiguration silently falls back to null publisher.
- **Risks introduced:**
  - Kafka unavailability causes publish failures; retries buffer briefly but events are dropped after `maxRetries` exhausted.
- **Risk mitigations:**
  - Retry with backoff (5 retries up to 3s) handles transient broker failures and leader elections.
  - `market_tick_publish_failed_total` counter (added to `TickMetricsService`) makes drop rate observable.
  - Kafka health check in Docker Compose prevents service start before broker is ready.

---

## Implementation and Migration

- **Required code/config updates:**
  1. `services/market-data-service/src/infrastructure/messaging/kafka-tick-publisher.ts` — new file
  2. `services/market-data-service/src/infrastructure/messaging/kafka-client.provider.ts` — KafkaJS `Kafka` and `Producer` providers
  3. `services/market-data-service/src/app.module.ts` — conditional provider binding based on `KAFKA_BROKER` env
  4. `services/market-data-service/src/infrastructure/metrics/tick-metrics.service.ts` — add `market_tick_publish_failed_total` counter
  5. `services/market-data-service/test/helpers/kafka-consumer.helper.ts` — test consumer utility
  6. `docker-compose.yml` — confirm `KAFKA_BROKER` env var wired to market-data-service; confirm `market.ticks` topic created in kafka `KAFKA_CREATE_TOPICS` or init script
  7. `.env.example` — document `KAFKA_BROKER` and `MARKET_DATA_KAFKA_TOPIC` vars
- **Migration/backfill steps:** none — market ticks are ephemeral; no historical replay required.
- **Rollback strategy:** Set `KAFKA_BROKER` to empty/unset → `AppModule` falls back to `NullTickPublisher`; service continues operating without publishing.

---

## Impact Assessment

- **Clean architecture/layering:** `KafkaTickPublisher` lives in `infrastructure/messaging/`; implements `ITickPublisher` port from `domain/ports/`. No domain or application layer changes required.
- **Reliability:** Idempotent producer + bounded retry covers transient failures. At-least-once delivery is acceptable for market tick events (consumers must be idempotent, covered in T4/T5).
- **Graceful shutdown:** `OnModuleDestroy` on `KafkaTickPublisher` calls `producer.disconnect()` after all in-flight sends complete. Compose and Kubernetes stop sequences already drain within 25s.
- **Security:** Kafka runs on internal Docker network; no external exposure. `KAFKA_BROKER` URL is env-driven, never hardcoded.
- **Observability:** `market_tick_publish_failed_total` metric surfaced on `GET /metrics`. Producer errors logged at `error` level with `symbol` and `error.message` fields.
- **Performance/scale:** Explicit partition assignment with 10 partitions supports horizontal consumer scaling. Idempotent producer imposes `maxInFlightRequests: 1` per partition — acceptable at 10 ticks/s; revisit at 100k+ ticks/s.
- **Licensing:** KafkaJS is MIT licensed; Apache Kafka is Apache 2.0. No paid dependency introduced.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit
- [x] Approval recorded (`@arch`)
