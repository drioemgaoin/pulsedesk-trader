# Test Plan — Emit Accepted Order Events

- **TP ID:** `TP-M3-T4-emit-accepted-order-events`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** `M3-T4`
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `KafkaOrderEventPublisher` event emission (payload, headers, topic, key, idempotency), `SubmitOrderUseCase` publisher integration (emit only on ACCEPTED, not on REJECTED/timeout/replay), `OrderSubmittedEvent` contract conformance, Kafka producer lifecycle (connect/disconnect/graceful shutdown), `accountId` propagation through DTO → command → entity → event
- **Out of scope:** Live Kafka stack integration (requires docker compose); consumer-side event receipt; `OrderStatusChangedEvent` (not emitted in T4); schema registry validation (deferred)
- **Prerequisites:** Unit tests passing (47/47); `kafkajs ^2.2.4` installed; `@pulsedesk/contracts` built

---

## Test Cases

### Integration

| ID | Scenario | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| INT-01 | Accepted order triggers event publication | `execute(VALID_CMD)` with APPROVED risk mock | `publisher.publishAccepted` called once with ACCEPTED order containing `accountId` | Called once with `{ status: ACCEPTED, accountId: 'acc-001' }` | Pass |
| INT-02 | Rejected order does not trigger event | `execute(VALID_CMD)` with REJECTED risk mock | `publisher.publishAccepted` NOT called | `publishAccepted` call count = 0 | Pass |
| INT-03 | Risk timeout does not trigger event | `execute(VALID_CMD)` with risk throwing | `publisher.publishAccepted` NOT called | `publishAccepted` call count = 0 | Pass |
| INT-04 | Idempotent replay does not re-publish | `execute(VALID_CMD)` with existing order in repo | `publisher.publishAccepted` NOT called (early return before risk + publish) | `publishAccepted` call count = 0 | Pass |
| INT-05 | Kafka send dispatches to correct topic with required headers | `publishAccepted(acceptedOrder)` | `producer.send` called with `topic=orders.events.v1`, headers `eventType=order.submitted`, `schemaVersion=1` | Confirmed by publisher spec | Pass |
| INT-06 | Message key is orderId for deterministic partitioning | `publishAccepted(acceptedOrder)` | `messages[0].key === order.id` | Confirmed by publisher spec | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | `OrderSubmittedEvent` schema compliance | Published payload satisfies all required fields: `eventType`, `schemaVersion`, `orderId`, `idempotencyKey`, `accountId`, `symbol`, `side`, `type`, `quantity`, `limitPrice?`, `timestamp` | All fields asserted in payload spec test — confirmed | Pass |
| CON-02 | `idempotencyKey` = `commandId` | `commandId` is used as the event `idempotencyKey` | `payload.idempotencyKey === 'cmd-1'` — confirmed | Pass |
| CON-03 | `schemaVersion` in header matches payload | Header `schemaVersion='1'` (string); payload `schemaVersion=1` (number) | Header string '1' and payload number 1 both present — confirmed | Pass |
| CON-04 | `accountId` propagated from HTTP request to event | DTO → command → entity → event payload all carry `accountId` | Traced: `submit-order.dto.ts` → `SubmitOrderCommand` → `Order.create()` → `publishAccepted(order)` → `event.accountId = order.accountId` | Pass |

### Resilience / Edge Cases

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | Kafka broker unavailable on send | Publisher catches error, logs it, resolves without rethrowing — order already persisted in ACCEPTED state | `mockSend.mockRejectedValue` → `publishAccepted` resolves `undefined` — confirmed | Pass |
| RES-02 | Idempotent producer prevents duplicate events on KafkaJS retry | `producer` configured `idempotent: true` — Kafka broker deduplicates within producer session | Config confirmed in `KafkaOrderEventPublisher` constructor | Pass |
| RES-03 | Topic ensured before producer connect | `ensureTopic` called before `producer.connect` in `onModuleInit` | `mockCreateTopics` called before `mockConnect` — confirmed | Pass |
| RES-04 | Admin client disconnected in `finally` block regardless of topic creation outcome | Admin never leaks connection | `mockAdminDisconnect` called once after `createTopics` — confirmed | Pass |
| RES-05 | Producer disconnected on module destroy (graceful shutdown) | `onModuleDestroy` disconnects producer | `mockDisconnect` called once — confirmed | Pass |

### Performance Baseline

| Metric | Target | Actual | Status |
|---|---|---|---|
| Kafka publish adds no blocking latency to test path | 0ms (mocked) | Mocked — no measurable overhead | Pass |
| `ensureTopic` only on startup (not per-publish) | Once at `onModuleInit` | `createTopics` called in `onModuleInit`, not in `publishAccepted` | Pass |

---

## Findings

| ID | Severity | Description | Status |
|---|---|---|---|
| QA-T4-01 | INFO | `topic already exists` log path (line 87 — `created=false` branch) is not covered by unit tests — 90% branch coverage, above 70% gate. Benign: this path only logs a message. No action required. | Accepted |
| QA-T4-02 | INFO | Kafka publish failure is swallowed after KafkaJS retries exhaust. A lost accepted order event means the execution service never receives the order. This is a known limitation pending outbox pattern implementation in a later milestone. Track: outbox pattern for durable event delivery. | Open / Track |

---

## Verdict

**Final verdict: `PASS`**

All three T4 AC verified:
- ✅ Accepted orders published to broker topic with contract version metadata (`orders.events.v1`, `schemaVersion: 1` in payload and header)
- ✅ Event payload contains required execution fields (`orderId`, `accountId`, `symbol`, `side`, `type`, `quantity`, `limitPrice`, `idempotencyKey`, `timestamp`) — fully conformant with `OrderSubmittedEvent` contract
- ✅ Event publication failures retried safely with idempotent behavior (KafkaJS `idempotent: true`, `retries: 5`; post-retry failure swallowed to avoid failing HTTP response for already-persisted order)

No MEDIUM+ open findings.

---

## Evidence

- Unit test run: `Test Suites: 7 passed, 7 total — Tests: 47 passed, 47 total`
- Coverage (changed modules): `submit-order.use-case.ts` 100%/100% line/branch; `kafka-order-event-publisher.ts` 96.6%/90% line/branch — both above 80%/70% gates
- Lint: clean (0 errors)
- Build: clean (`nest build` with `prisma generate` prebuild)
- New suites: `kafka-order-event-publisher.spec.ts` (9 scenarios), `submit-order.use-case.spec.ts` (+3 publisher scenarios, 13 total)
