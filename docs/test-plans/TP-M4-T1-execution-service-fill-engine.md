# Test Plan — Execution Service Fill Engine

- **TP ID:** `TP-M4-T1-execution-service-fill-engine`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** `M4-T1`
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `ProcessOrderUseCase` fill derivation (LIMIT and MARKET), idempotency via `orderId` key, `Execution` entity invariants, `KafkaFillEventPublisher` event emission (payload, headers, topic, key), `KafkaOrderEventConsumer` offset-commit strategy (commit on success/poison-pill, no-commit on `NoMarketPriceError`), `KafkaMarketTickConsumer` price cache update, `InMemoryMarketPriceCache`, `OrderFilledEvent` contract conformance, publisher failure resilience, graceful shutdown lifecycle
- **Out of scope:** Live Kafka/Postgres stack integration (requires docker compose); `PrismaExecutionRepository` DB adapter (integration test scope); partial fills (explicitly out of scope for T1); schema registry validation (deferred)
- **Prerequisites:** Unit tests passing (30/30); `kafkajs ^2.2.4`, `@prisma/client ^7.4.2`, `pg ^8.20.0` installed; `@pulsedesk/contracts` built

---

## Test Cases

### Integration

| ID | Scenario | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| INT-01 | LIMIT order event produces fill at limit price | `execute(LIMIT_EVENT)` with `limitPrice=150` | `execution.fillPrice = 150`, `filledQuantity = event.quantity`, `created = true` | `fillPrice=150`, `filledQuantity=10`, `created=true` | Pass |
| INT-02 | MARKET order event produces fill at cached price | `execute(MARKET_EVENT)` with cache returning `155.5` | `execution.fillPrice = 155.5` | `fillPrice=155.5` | Pass |
| INT-03 | MARKET order with no cached price throws NoMarketPriceError | `execute(MARKET_EVENT)` with cache returning `null` | `NoMarketPriceError` thrown, `repo.save` not called | Exception thrown, `save` not called | Pass |
| INT-04 | Duplicate order event returns existing without re-saving | `execute(event)` when `findByIdempotencyKey` returns existing | `created=false`, existing returned, `repo.save` not called, `publisher.publishFill` not called | Confirmed | Pass |
| INT-05 | Publisher failure does not propagate — execution already persisted | `publishFill` rejects with broker error | `execute()` resolves, `repo.save` called once | Resolves `{ created: true }` — confirmed | Pass |

### Consumer Offset Strategy

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| CON-01 | Successful processing commits offset +1 | `commitOffsets` called with `offset = message.offset + 1` | Confirmed by consumer spec | Pass |
| CON-02 | `NoMarketPriceError` — offset NOT committed | Kafka redelivers; `commitOffsets` not called | `commitOffsets` call count = 0 — confirmed | Pass |
| CON-03 | Unexpected error — offset committed (poison-pill protection) | `commitOffsets` called once to skip broken message | `commitOffsets` called once — confirmed | Pass |
| CON-04 | Null message value — early return, no use case call, no commit | `execute` not called, no crash | Confirmed by consumer spec | Pass |
| CON-05 | Malformed JSON — skip + commit to avoid poison pill | `execute` not called, `commitOffsets` called | Confirmed by consumer spec | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-C01 | `OrderFilledEvent` schema compliance | Published payload satisfies all required fields: `eventType`, `schemaVersion`, `executionId`, `orderId`, `accountId`, `symbol`, `side`, `filledQuantity`, `fillPrice`, `timestamp` | All fields asserted in publisher spec — confirmed | Pass |
| CON-C02 | `schemaVersion` in header matches payload | Header `schemaVersion='1'` (string); payload `schemaVersion=1` (number) | Confirmed by publisher spec | Pass |
| CON-C03 | `orderId` used as message key for deterministic partitioning | `messages[0].key === execution.orderId` | Confirmed by publisher spec | Pass |
| CON-C04 | Topic is `execution.events.v1` with 10 partitions | `createTopics` called with `numPartitions: 10`, `send` to `execution.events.v1` | Confirmed by publisher spec | Pass |

### Resilience / Edge Cases

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | Kafka broker unavailable on `publishFill` | Publisher throws, use case catches, logs error, execution already saved | `mockSend.mockRejectedValue` → `execute()` resolves — confirmed | Pass |
| RES-02 | Idempotent producer prevents duplicate fill events on KafkaJS retry | `producer` configured `idempotent: true` | Config confirmed in `KafkaFillEventPublisher` constructor | Pass |
| RES-03 | Topic ensured before producer connect | `ensureTopic` called before `producer.connect` in `onModuleInit` | `mockCreateTopics` called before `mockConnect` — confirmed | Pass |
| RES-04 | Admin client disconnected in `finally` block regardless of outcome | Admin never leaks connection | `mockAdminDisconnect` called once after `createTopics` — confirmed | Pass |
| RES-05 | Producer disconnected on module destroy | `onModuleDestroy` disconnects producer | `mockDisconnect` called once — confirmed | Pass |
| RES-06 | Order consumer disconnected on module destroy | `onModuleDestroy` disconnects consumer | `mockDisconnect` called once — confirmed | Pass |
| RES-07 | Market tick consumer disconnected on module destroy | `onModuleDestroy` disconnects consumer | `mockDisconnect` called once — confirmed | Pass |
| RES-08 | Market tick cache updated on valid tick; silent skip on malformed | `setPrice` called on valid; not called on null/malformed | Confirmed by market tick consumer spec | Pass |

### Performance Baseline

| Metric | Target | Actual | Status |
|---|---|---|---|
| Fill publish adds no blocking latency to test path | 0ms (mocked) | Mocked — no measurable overhead | Pass |
| `ensureTopic` only on startup (not per-publish) | Once at `onModuleInit` | `createTopics` called in `onModuleInit`, not in `publishFill` | Pass |

---

## Findings

| ID | Severity | Description | Status |
|---|---|---|---|
| QA-T1-01 | INFO | `topic already exists` log branch in `KafkaFillEventPublisher` (line 79 — `created=false` branch) not covered by unit tests — 96.29%/87.5% line/branch, above 80%/70% gate. Same benign pattern as QA-T4-01. | Accepted |
| QA-T1-02 | INFO | `PrismaExecutionRepository` has 0% unit test coverage — requires live Postgres; integration test scope. Consistent with M3 repository pattern. Idempotency guarantee is DB-enforced via `idempotencyKey UNIQUE` constraint; functional path verified via use-case mocks. | Accepted |
| QA-T1-03 | INFO | Outbox gap: fill persisted but `OrderFilledEvent` not delivered if KafkaJS retries exhaust. Portfolio service never receives the fill. Known limitation, same class as QA-T4-02. Track: outbox pattern for execution-service in later milestone. | Open / Track |
| QA-T1-04 | INFO | Consumer spec added inline by @qa — `kafka-order-event-consumer.spec.ts` was missing on @dev handoff (0% coverage on offset-commit logic). Fixed before test plan completion. | Fixed |

---

## Verdict

**Final verdict: `PASS`**

All four T1 AC verified:
- ✅ Execution service consumes accepted order events (`KafkaOrderEventConsumer` with `autoCommit: false`, subscribes to `orders.events.v1`)
- ✅ Fill generation supports MARKET and LIMIT with deterministic rules (LIMIT → `event.limitPrice`; MARKET → `IMarketPriceCache.getPrice(symbol)`; partial fills explicitly out of scope and documented)
- ✅ Partial fill path explicitly out of scope — documented in design note and milestone
- ✅ Fill events published with idempotency safeguards (idempotent KafkaJS producer, `idempotencyKey = orderId` with DB UNIQUE constraint, duplicate events skipped via `findByIdempotencyKey`)

No MEDIUM+ open findings.

---

## Evidence

- Unit test run: `Test Suites: 6 passed, 6 total — Tests: 30 passed, 30 total`
- Coverage (changed modules): `process-order.use-case.ts` 100%/100%; `execution.entity.ts` 100%/100%; `kafka-fill-event-publisher.ts` 96.29%/87.5%; `kafka-order-event-consumer.ts` 100%/100%; `kafka-market-tick-consumer.ts` 100%/100%; `in-memory-market-price-cache.ts` 100%/100% — all above 80%/70% gates
- Lint: clean (0 errors)
- Build: clean (`prisma generate` + `nest build`)
- New suites: `execution.entity.spec.ts` (3), `process-order.use-case.spec.ts` (5), `kafka-fill-event-publisher.spec.ts` (7), `kafka-order-event-consumer.spec.ts` (6, added by @qa), `kafka-market-tick-consumer.spec.ts` (5, added by @qa), `in-memory-market-price-cache.spec.ts` (3, added by @qa)
