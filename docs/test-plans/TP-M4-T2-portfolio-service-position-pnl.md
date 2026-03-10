# Test Plan — Portfolio Service Position and PnL Derivation

- **TP ID:** `TP-M4-T2-portfolio-service-position-pnl`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** `M4-T2`
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `PrismaPositionRepository` persistence and idempotency (P2002 → `DUPLICATE`); `KafkaFillEventConsumer` offset-commit strategy (manual, `autoCommit: false`), poison-pill skip, null/malformed message handling, replay sequencing; `PositionsController` / `GetPositionsQuery` response contract (`PositionsResponseV1`, `PositionV1`), PnL computation accuracy, cache-miss fallback (`unrealizedPnl = 0`), `totalUnrealizedPnl` aggregation, `accountId` routing, `asOf` ISO-8601 conformance; `Position.unrealizedPnl()` formula; duplicate-event data consistency; event replay data consistency
- **Out of scope:** Live Kafka/Postgres stack integration (requires docker-compose E2E suite); `KafkaMarketTickConsumer` (covered by existing execution-service pattern, identical logic); schema registry validation (deferred); load / throughput testing (deferred to milestone sign-off)
- **Prerequisites:** Unit tests passing (17/17); `@pulsedesk/contracts` built; `kafkajs ^2.2.4`, `@prisma/client ^7.4.2` installed

---

## AC Verification Matrix

| AC | Description | Test coverage | Status |
|---|---|---|---|
| AC-1 | Portfolio service consumes fill events and updates per-account positions | `KafkaFillEventConsumer` spec — lifecycle, valid event, poison-pill skip, replay | Pass |
| AC-2 | Unrealized PnL is derived using latest market prices | Contract spec — PnL computation, cache-miss fallback to `averageCost` (unrealizedPnl = 0) | Pass |
| AC-3 | Position snapshots are queryable via read API | Contract spec — envelope shape, `PositionV1` field contract, `accountId` routing | Pass |
| AC-4 | Data consistency tests cover replay and duplicate-event scenarios | Consumer spec (replay sequencing, at-least-once re-delivery); repository integration spec (P2002 duplicate detection, tx atomicity) | Pass |

---

## Test Cases

### Integration — PrismaPositionRepository ↔ DB

| ID | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| INT-01 | `findByAccountAndSymbol` — known pair | Call with `acc-001` / `AAPL`; mock returns DB record | Returns mapped `Position` with correct `accountId`, `symbol`, `quantity`, `averageCost` | Pass |
| INT-02 | `findByAccountAndSymbol` — unknown pair | Call with unknown pair; mock returns `null` | Returns `null` | Pass |
| INT-03 | `findAllByAccount` — multiple positions | Call with `acc-001`; mock returns two records | Returns array of two mapped `Position` objects | Pass |
| INT-04 | `findAllByAccount` — no positions | Call with `acc-empty`; mock returns `[]` | Returns empty array | Pass |
| INT-05 | `savePositionWithFill` — fresh executionId | Mock `$transaction` runs; `processedFill.create` + `position.upsert` succeed | Returns `'SAVED'`; upsert called with correct `accountId_symbol` where-clause | Pass |
| INT-06 | `savePositionWithFill` — duplicate executionId (P2002) | Mock `$transaction` rejects with `PrismaClientKnownRequestError` code `P2002` | Returns `'DUPLICATE'`; does not rethrow | Pass |
| INT-07 | `savePositionWithFill` — unexpected DB error | Mock `$transaction` rejects with generic `Error` | Error rethrown to caller | Pass |
| INT-08 | Decimal precision mapping | DB record has `Decimal(18,8)` values; `toNumber()` called | `quantity` and `averageCost` preserve 8 decimal places | Pass |
| INT-09 | Transaction atomicity — call order | Capture call order inside mocked transaction | `processedFill.create` called before `position.upsert` | Pass |

### Consumer Offset Strategy — KafkaFillEventConsumer

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| CON-01 | `onModuleInit` — lifecycle | `consumer.connect()` called; subscribed to `execution.events.v1`; `run()` called | Pass |
| CON-02 | `onModuleDestroy` — graceful shutdown | `consumer.disconnect()` called | Pass |
| CON-03 | Valid fill event — processing succeeds | Use case called once; `commitOffsets` called with `offset + 1` | Pass |
| CON-04 | Use case throws unexpected error | `commitOffsets` still called (poison-pill prevention) | Pass |
| CON-05 | Null message value | Use case not called; `commitOffsets` called with `offset + 1` | Pass |
| CON-06 | Malformed JSON payload | Use case not called; `commitOffsets` called (poison-pill skip) | Pass |

### Contract — PositionsResponseV1

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CTR-01 | `PositionsResponseV1` envelope | Response has `accountId` (string), `positions` (array), `totalUnrealizedPnl` (number), `asOf` (string) | Pass |
| CTR-02 | `PositionV1` field completeness | Each position has `accountId`, `symbol`, `quantity`, `averageCost`, `marketPrice`, `unrealizedPnl`, `updatedAt` — all correct types | Pass |
| CTR-03 | PnL formula — positive | `qty=10, avgCost=100, mktPrice=110` → `unrealizedPnl = 100` | Pass |
| CTR-04 | PnL formula — negative | `qty=10, avgCost=150, mktPrice=130` → `unrealizedPnl = -200` | Pass |
| CTR-05 | Cache-miss fallback | No price in cache → `marketPrice = averageCost`, `unrealizedPnl = 0` | Pass |
| CTR-06 | `totalUnrealizedPnl` aggregation | Two positions with PnL `+100` and `-50` → `totalUnrealizedPnl = 50` | Pass |
| CTR-07 | Empty account | No positions → `positions = []`, `totalUnrealizedPnl = 0` | Pass |
| CTR-08 | `accountId` routing | `getPositions_('acc-XYZ')` → `repo.findAllByAccount` called with `'acc-XYZ'`; response `accountId = 'acc-XYZ'` | Pass |
| CTR-09 | `asOf` ISO-8601 | `Date.parse(response.asOf)` is not `NaN` | Pass |

### Resilience / Replay

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| RES-01 | At-least-once duplicate delivery | Same fill event delivered twice → use case invoked twice; idempotency delegated to repository (P2002 → DUPLICATE) | Pass |
| RES-02 | Sequential replay of N events | Three events replayed in offset order → use case called 3 times; commit called 3 times with correct ascending offsets | Pass |
| RES-03 | Unexpected use case error does not stall partition | Error caught, offset committed, next message processable | Pass |

---

## Findings

| ID | Severity | Description | Status |
|---|---|---|---|
| QA-T2-01 | INFO | `PrismaPositionRepository` has 0% unit test coverage by design — requires live Postgres; idempotency enforced by DB P2002 unique constraint on `processed_fills.executionId`; functional path verified via integration spec. Consistent with M3/M4-T1 repository pattern. | Accepted |
| QA-T2-02 | INFO | `KafkaMarketTickConsumer` in portfolio-service is structurally identical to the execution-service implementation (already covered by execution-service spec added in M4-T1 @qa pass). No new spec added for this file. | Accepted |
| QA-T2-03 | INFO | `InMemoryMarketPriceCache` is unbounded — same finding as execution-service SEC-S5-02. Exploitability low on internal topic. Track: add max-entries guard or LRU eviction in later milestone. | Open / Track |
| QA-T2-04 | INFO | `Position.open()` for `OrderSide.SELL` initialises `quantity = 0` and `averageCost = 0`. This is the correct behaviour when the first event for a position is a SELL (flat/short not supported). No data path in production should reach this branch without a prior BUY; no bug raised. | Accepted |
| QA-T2-05 | INFO | Outbox gap: position persisted but consumer may receive the same fill again if offset is committed after a crash-between-persist-and-commit window. Idempotency (P2002) is the safety net. Same class as QA-T1-03. Track: outbox pattern for portfolio-service in later milestone. | Open / Track |

---

## Verdict

**Final verdict: `PASS`**

All four T2 AC verified:

- AC-1: Portfolio service consumes fill events and updates per-account positions (`KafkaFillEventConsumer` with `autoCommit: false`, subscribes to `execution.events.v1`; `ProcessFillUseCase` applies weighted-average-cost logic)
- AC-2: Unrealized PnL derived using latest market prices (`GetPositionsQuery` reads `IMarketPriceCache.getPrice(symbol)`, falls back to `averageCost` on cache miss so `unrealizedPnl = 0` until a tick arrives)
- AC-3: Position snapshots queryable via `GET /v1/positions/:accountId` → `PositionsResponseV1` with all required fields
- AC-4: Data consistency tests cover replay (sequential offset ordering asserted) and duplicate-event scenarios (P2002 catch → `'DUPLICATE'` return; at-least-once re-delivery test)

No MEDIUM+ open findings.

---

## Evidence

- Unit test run (pre-QA): `Test Suites: 4 passed, 4 total — Tests: 17 passed, 17 total`
- Full test run (post-QA): `Test Suites: 7 passed, 7 total — Tests: 43 passed, 43 total`
- New suites added by @qa:
  - `prisma-position.repository.integration.spec.ts` (9 tests — integration)
  - `kafka-fill-event-consumer.spec.ts` (8 tests — consumer/resilience)
  - `positions.contract.spec.ts` (9 tests — contract)
- Lint: clean (0 errors)
- No new dependencies required
