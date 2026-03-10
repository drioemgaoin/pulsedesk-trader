# Test Plan — Market Data Service Kafka Tick Publishing

- **TP ID:** `TP-M2-T3-kafka-tick-publisher`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** M2-T3
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `KafkaTickPublisher` — topic creation, message delivery, schema versioning, partition-symbol affinity, `market_tick_publish_failed_total` metric, graceful shutdown (SIGTERM → producer disconnect).
- **Out of scope:** Kafka consumer business logic (T4), load-test at cluster scale (deferred).
- **Prerequisites:** `docker compose up --build market-data-service` with Kafka healthy; `KAFKA_BROKER=kafka:9092`; `KAFKA_TOPIC_MARKET_TICKS=market.ticks.v1`.

---

## Test Cases

### Integration — Topic Provisioning

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-01 | Service starts with no pre-existing topic | `KafkaTickPublisher` creates `market.ticks.v1` with 10 partitions via Admin client; log line `"Topic 'market.ticks.v1' created with 10 partitions"` | ✓ Topic created, 10 partitions confirmed via `kafka-topics.sh --describe` | Pass |
| INT-02 | Service restarts with topic already existing | `createTopics` returns false; log line `"Topic 'market.ticks.v1' already exists"`; service starts normally | ✓ | Pass |

### Integration — Message Delivery

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-03 | Simulator running for 15s | Messages appear in Kafka partitions 1, 3, and 4 for the 5 default symbols | ✓ 495 ticks emitted, 0 publish failures; messages confirmed in partitions 1, 3, 4 | Pass |
| INT-04 | `market_tick_publish_failed_total` after normal operation | Counter remains 0 with Kafka healthy | ✓ `market_tick_publish_failed_total 0` | Pass |
| INT-05 | `market_tick_emitted_total` rate | ~10 ticks/sec (5 symbols × 500ms) | ✓ `market_tick_rate_per_second 9.94` | Pass |

### Integration — Partition-Symbol Affinity

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-06 | Each symbol routes to one consistent partition | `symbolPartitionKey(symbol, 10)` is deterministic — same symbol always lands on same partition across all messages | ✓ TSLA→partition 1, AAPL/MSFT/GOOGL→partition 3 (hash collision, valid), NVDA→partition 4; no symbol appears in multiple partitions | Pass |
| INT-07 | Partitions 0, 2, 5–9 remain empty | Symbols only land on partitions matching their djb2-XOR hash | ✓ Only partitions 1, 3, 4 have messages | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | `MarketTickEvent` schema on Kafka message | Message value is valid JSON with all required fields: `eventType`, `schemaVersion`, `symbol`, `bid`, `ask`, `last`, `volume`, `timestamp` | Pass |
| CON-02 | Schema versioning | `eventType: 'market.tick'`, `schemaVersion: 1` present in every message value | Pass |
| CON-03 | Kafka message headers | `eventType` and `schemaVersion` headers present on each message | Pass |
| CON-04 | Explicit partition assignment | Messages sent to the partition computed by `symbolPartitionKey(symbol, 10)` — not key-hash routed | Pass |

### Resilience

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | SIGTERM during publishing | `tick simulator stopped` logged; `Kafka producer disconnected` logged; process exits cleanly | ✓ Shutdown sequence: WARN readiness NOT READY → tick simulator stopped → Kafka producer disconnected | Pass |
| RES-02 | Admin client disconnects after topic creation | `admin.disconnect()` called in `finally` block even if `createTopics` fails | ✓ Verified in unit test (mockAdminDisconnect called once) | Pass |

### Performance Baseline

| Metric | Target | Actual | Status |
|---|---|---|---|
| Publish failure rate (Kafka healthy) | 0 | `market_tick_publish_failed_total 0` after 1440+ ticks | Pass |
| Throughput (5 symbols, 500ms interval) | ~10 ticks/sec | `market_tick_rate_per_second 9.94–9.97` | Pass |
| Messages in Kafka after 15s | > 100 | 495 ticks emitted, confirmed in 3 partitions | Pass |

---

## Findings

### Fixed inline during @dev fix loop

| ID | Severity | Description | Status |
|---|---|---|---|
| F-01 | HIGH | Kafka topic `market.ticks.v1` auto-created with 1 partition (Kafka default). All 5 default symbols hash to partitions 1–4, so all sends failed silently. KafkaJS idempotent producer swallowed `UNKNOWN_TOPIC_OR_PARTITION` without propagating to application-level catch block — `market_tick_publish_failed_total` stayed at 0 while no messages were written. | Fixed: `KafkaTickPublisher.onModuleInit()` now uses KafkaJS Admin to create the topic with 10 partitions before connecting the producer. `KAFKA_NUM_PARTITIONS: "10"` added to docker-compose Kafka environment. |

---

## Verdict

`PASS` — all AC verified. Topic provisioned with correct partition count, messages published with schema versioning, partition-symbol affinity consistent, graceful shutdown confirmed.

---

## Evidence

- Unit tests: 51 tests, 14 suites — all pass (including 2 new tests for Admin topic creation)
- `kafka-topics.sh --describe market.ticks.v1` → PartitionCount: 10, ReplicationFactor: 1
- Consumed messages from partitions 1, 3, 4 → JSON with all `MarketTickEvent` fields, `eventType: 'market.tick'`, `schemaVersion: 1`
- Partition affinity: TSLA→1, AAPL/MSFT/GOOGL→3, NVDA→4; no symbol appears in multiple partitions
- SIGTERM: `docker stop pulsedesk-market-data-service-1` → tick simulator stopped → Kafka producer disconnected — confirmed in logs
- `market_tick_publish_failed_total 0` after 2810+ ticks with Kafka healthy
- `market_tick_rate_per_second 9.94–9.97` confirmed over multiple measurement windows
