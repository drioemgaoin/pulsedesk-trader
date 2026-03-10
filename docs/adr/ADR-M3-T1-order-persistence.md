# ADR-M3-T1: Order Service Persistence and Idempotency Strategy

- **Date:** 2026-03-10
- **Status:** Accepted
- **Task:** M3-T1

---

## Decision

Use **Prisma ORM** with **PostgreSQL** for Order Service persistence. Enforce idempotency via a `commandId` unique index on the `orders` table.

---

## Context

- Order Service must accept order commands durably (FR-04) with idempotency key handling.
- PostgreSQL + Prisma are the approved stack for write services (ARCHITECTURE.md §4.1).
- FR-15 mandates atomic consistency between DB writes and event publication (outbox — addressed in T4).

---

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| ORM | Prisma | Approved stack; type-safe query builder; migration tooling included |
| Idempotency key | `commandId` unique index (DB-level) | Hard guard against race-condition duplicate inserts; use-case does application-level early-return on duplicate |
| Idempotency response | Return existing order with same HTTP status | Caller gets consistent response regardless of retry |
| Schema | Single `orders` table, `status` string field | Simple state machine; no join table needed at M3 scope |
| Decimal precision | `DECIMAL(18,8)` for quantity/limitPrice | Preserves financial precision without floating-point errors |
| Migration strategy | Prisma Migrate with committed SQL files | Reproducible, reviewable, versioned schema changes |

---

## Idempotency contract

1. Client generates a UUID v4 `commandId` per order intent.
2. Client retries with the **same** `commandId` on network failures.
3. `SubmitOrderUseCase` checks `findByCommandId` first; returns existing order if found (`created: false`).
4. Prisma unique constraint on `commandId` is the hard guard if two concurrent requests slip past the use-case check.
5. `201` returned for both new and idempotent replays (simplifies client handling).

---

## Consequences

- Downstream: T4 will add outbox table to this schema for event publication atomicity.
- T3 will add `RISK_DECISION` status transitions to the Order aggregate.
