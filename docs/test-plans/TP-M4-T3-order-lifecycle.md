# Test Plan — TP-M4-T3: Order Lifecycle Updates from Execution Events

**Milestone:** M4 — Execution and Portfolio Pipeline
**Task:** T3 — Order lifecycle updates from execution events
**Prepared by:** @qa
**Date:** 2026-03-10
**Status:** PASS

---

## 1. Scope

This test plan covers the order-service components added in M4-T3:

| Component | File |
|---|---|
| Domain transitions | `src/domain/order.entity.ts` — `fill()`, `cancel()` |
| Application use case | `src/application/use-cases/process-fill-notification.use-case.ts` |
| Infrastructure consumer | `src/infrastructure/messaging/kafka-execution-event-consumer.ts` |

Out of scope: end-to-end broker connectivity, execution-service internals, portfolio-service.

---

## 2. Acceptance Criteria Mapping

| AC | Test location | Verdict |
|---|---|---|
| Order status transitions (accepted → filled, accepted/pending → cancelled, rejected) are consistent | `order-status.contract.spec.ts` — state-machine suite | PASS |
| Order state remains coherent under retries/replays | `kafka-execution-event-consumer.spec.ts` — replay scenario; `process-fill-notification.use-case.spec.ts` — idempotency | PASS |
| Out-of-order event handling rules are defined and tested | JSDoc on `Order.fill()` + `ProcessFillNotificationUseCase`; `process-fill-notification.use-case.spec.ts` — REJECTED/CANCELLED/PENDING skip scenarios | PASS |

---

## 3. Test Suites

### 3.1 Consumer Integration / Resilience
**File:** `src/infrastructure/messaging/kafka-execution-event-consumer.spec.ts`
**Type:** Integration / Resilience (QA scope)
**Kafka broker:** Mocked via `jest.mock('kafkajs')`

| # | Scenario | Expected outcome |
|---|---|---|
| C-01 | Module init — connect | `consumer.connect()` called once |
| C-02 | Module init — subscribe | Subscribed to `execution.events.v1` |
| C-03 | Module init — autoCommit | `run()` called with `autoCommit: false` |
| C-04 | Module destroy | `consumer.disconnect()` called |
| C-05 | Valid `execution.filled` message | Use case called with parsed event; offset +1 committed |
| C-06 | Null-value message (tombstone) | Use case NOT called; offset +1 committed |
| C-07 | Malformed JSON | Use case NOT called; offset +1 committed (poison-pill) |
| C-08 | Use case throws unexpected error | Error does not propagate; offset +1 committed (poison-pill) |
| C-09 | `execution.cancelled` eventType | Use case NOT called; offset +1 committed |
| C-10 | `order.submitted` eventType | Use case NOT called; offset +1 committed |
| C-11 | Same message delivered twice (replay) | Use case called twice; offset committed twice (idempotency delegated to use case) |

### 3.2 HTTP Contract / State Machine
**File:** `src/interfaces/http/order-status.contract.spec.ts`
**Type:** Contract / State machine (QA scope)
**HTTP server:** NestJS TestingModule with mocked use cases (no live server)

#### 3.2.1 GET /v1/orders/:id response contract

| # | Scenario | Expected outcome |
|---|---|---|
| R-01 | Order in FILLED status | Response `status === 'FILLED'` |
| R-02 | FILLED response shape | `id`, `commandId`, `accountId`, `symbol`, `status` all present |
| R-03 | Timestamps are ISO-8601 strings | `createdAt` and `updatedAt` are parseable date strings |
| R-04 | ACCEPTED status returned | Response `status === 'ACCEPTED'` |
| R-05 | PENDING status returned | Response `status === 'PENDING'` |
| R-06 | REJECTED status returned | Response `status === 'REJECTED'` |
| R-07 | CANCELLED status returned | Response `status === 'CANCELLED'` |
| R-08 | Unknown order ID | `NotFoundException` thrown (404 contract) |

#### 3.2.2 Order domain state machine

| # | From status | Operation | Expected outcome |
|---|---|---|---|
| SM-01 | PENDING | `accept()` | → ACCEPTED |
| SM-02 | PENDING | `reject(reason)` | → REJECTED, rejectionReason set |
| SM-03 | ACCEPTED | `fill()` | → FILLED |
| SM-04 | ACCEPTED | `cancel()` | → CANCELLED |
| SM-05 | PENDING | `cancel()` | → CANCELLED |
| SM-06 | FILLED | `fill()` | throws `OrderValidationError` (terminal guard) |
| SM-07 | REJECTED | `fill()` | throws `OrderValidationError` (terminal guard) |
| SM-08 | CANCELLED | `fill()` | throws `OrderValidationError` (terminal guard) |
| SM-09 | FILLED | `cancel()` | throws `OrderValidationError` (terminal guard) |
| SM-10 | REJECTED | `cancel()` | throws `OrderValidationError` (terminal guard) |
| SM-11 | CANCELLED | `cancel()` | throws `OrderValidationError` (idempotency guard) |
| SM-12 | ACCEPTED | `fill()` immutability | Original order retains ACCEPTED status |
| SM-13 | ACCEPTED | `fill()` timestamp | `updatedAt` on filled order >= original `updatedAt` |

---

## 4. Out-of-Order Event Handling Rules

Rules are defined in JSDoc on `Order.fill()` and `ProcessFillNotificationUseCase` and verified in unit tests (`process-fill-notification.use-case.spec.ts`):

| Order status when fill event arrives | Behaviour |
|---|---|
| ACCEPTED | Transition to FILLED, save, return filled order |
| FILLED | Skip — return existing (idempotency, no double-fill) |
| REJECTED | Skip with warning log (out-of-order / execution lag) |
| CANCELLED | Skip with warning log (out-of-order / execution lag) |
| PENDING | Skip with warning log (should not happen — execution only processes ACCEPTED) |
| Not found | Skip with warning log (poison-pill — wrong topic or deleted order) |

---

## 5. Test Execution Results

| Suite | Tests | Pass | Fail |
|---|---|---|---|
| `order.entity.spec.ts` (unit, pre-existing + T3 additions) | 16 | 16 | 0 |
| `process-fill-notification.use-case.spec.ts` (unit, pre-existing + T3 additions) | 10 | 10 | 0 |
| `kafka-execution-event-consumer.spec.ts` (QA, new) | 17 | 17 | 0 |
| `order-status.contract.spec.ts` (QA, new) | 21 | 21 | 0 |
| All other pre-existing suites | 33 | 33 | 0 |
| **Total** | **97** | **97** | **0** |

Run command: `pnpm --filter @pulsedesk/order-service test`

---

## 6. Findings

| ID | Severity | Finding |
|---|---|---|
| QA-T3-01 | INFO | `KafkaExecutionEventConsumer` constructor builds Kafka instance directly (no DI injection point for broker config). Broker URL is read from `process.env` at construction time — integration tests relying on mock are unaffected, but env substitution in tests requires `process.env` overrides pre-construction. Acceptable for current scope. |
| QA-T3-02 | INFO | The `working` status mentioned in the T3 AC is not present in the `OrderStatus` enum (values: PENDING, ACCEPTED, REJECTED, FILLED, CANCELLED). The implementation covers all five defined statuses consistently; `working` appears to be a conceptual name for ACCEPTED. No gap in implementation. |
| QA-T3-03 | INFO | Offset commit for the unexpected-error path happens in the outer `commitOffsets` call that runs after the `try/catch` block — meaning the offset is always committed regardless of use-case success or failure. This is the intended poison-pill design. Verified by C-08. |

---

## 7. Verdict

**T3 QA: PASS**

All three AC items are met. 97 tests pass. No blocking findings.
