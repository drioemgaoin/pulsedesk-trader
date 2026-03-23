# @pulsedesk/contracts

The **shared type contract layer** for PulseDesk — a pure TypeScript package with no runtime dependencies. It exports HTTP request/response DTOs used by both frontend API calls and backend service handlers, Kafka event interfaces shared between producers and consumers, and WebSocket message types for the real-time stream.

## Role in the System

This package is the single source of truth for every shape that crosses a service boundary. When the `execution-service` emits an `OrderSubmittedEvent` and the `order-service` consumes it, both reference the same interface. When `trading-mfe` calls `POST /api/v1/orders`, the request body type and the response type are both from this package. Schema drift between producers and consumers is a compiler error, not a runtime surprise.

## Key Features

### HTTP DTOs (`src/api/v1/`)

- **`order.dto.ts`** — `OrderSide` (`BUY | SELL`), `OrderType` (`MARKET | LIMIT`), `OrderStatus` (six states: `PENDING | ACCEPTED | REJECTED | FILLED | PARTIALLY_FILLED | CANCELLED`), `SubmitOrderRequestV1` (includes `idempotencyKey` for safe retries), `OrderResponseV1`, `CancelOrderResponseV1`.
- **`position.dto.ts`** — `PositionResponseV1` (symbol, quantity, averageCost, marketPrice, unrealizedPnl, realizedPnl, marketValue) and `PositionsResponseV1` (wrapper with `positions[]` and `totalUnrealizedPnl`).
- **`market.dto.ts`** — REST types for market data queries.
- **`pagination.dto.ts`** — `PaginationMeta` (total, page, pageSize, totalPages) used by any paginated endpoint response.

### Kafka Event Interfaces (`src/events/`)

- **`order.event.ts`** — `OrderSubmittedEvent` (eventType: `'order.submitted'`, schemaVersion, orderId, idempotencyKey, accountId, symbol, side, type, quantity, limitPrice?, timestamp) and `OrderStatusChangedEvent` (eventType: `'order.statusChanged'`, previousStatus, newStatus, reason?).
- **`market.event.ts`** — `MarketTickEvent` for price updates propagated through the system.
- **`execution.event.ts`** — `OrderFilledEvent` and related execution events emitted by the execution service after matching.
- **`portfolio.event.ts`** — Portfolio update events emitted when positions change.

All Kafka events include `schemaVersion: 1` — a forward-compatibility guard. When a breaking change is needed, the version increments and consumers can route by version.

### WebSocket Message Types (`src/ws/v1/`)

- **`stream-message.dto.ts`** — discriminated union of all message types sent over the notification-service WebSocket. Frontend code narrows on the `type` field to handle ticks vs. fill events.

## Design Decisions

**Why pure TypeScript with no runtime dependencies:** Contracts are types, not logic. Adding a runtime dependency (e.g. Zod for validation) would make the package a concern of both build pipelines and production bundles. Validation belongs at the API boundary layer in each service, using the contracts package's types as the schema source.

**Why `schemaVersion` on every Kafka event:** Kafka topics are long-lived. A topic created today may have consumers running six months from now when the event shape has changed. `schemaVersion` allows consumers to handle both old and new events during rolling deployments by branching on the version field. It is cheaper than a schema registry for this codebase's scale.

**Why `idempotencyKey` on `SubmitOrderRequestV1`:** Order submission must be safe to retry. Network errors between the frontend and the API gateway are indistinguishable from errors inside the gateway. If the frontend retries a `POST /orders` without an idempotency key, a duplicate order may be created. The execution service deduplicates on `idempotencyKey`, and the frontend generates a `crypto.randomUUID()` per form submission.

**Why separate `api/` and `events/` namespaces:** HTTP contracts and Kafka contracts have different consumers. Frontend apps use `api/` types; backend microservices use both. Separating them allows a frontend bundle analyser to confirm that no Kafka event types were accidentally bundled (they are TypeScript-only, so in practice they are erased, but the namespace separation makes intent explicit).

## Build

```bash
# Compile TypeScript to CJS dist/ (for Node.js services)
pnpm build
# output: dist/index.js, dist/index.d.ts
```

Frontend apps import directly from `src/` via the `workspace:*` resolution — Vite compiles the TypeScript inline, so the `dist/` build is only needed for Node.js backend services that require pre-compiled CJS.

## Consuming this Package

**Frontend (TypeScript/Vite):**
```typescript
import type { SubmitOrderRequestV1, OrderResponseV1 } from '@pulsedesk/contracts';
```
Imports resolve to `src/` directly. No build step required on the frontend side.

**Node.js backend services:**
```javascript
const { OrderSubmittedEvent } = require('@pulsedesk/contracts');
// resolves to dist/index.js
```
Run `pnpm build` before publishing or linking in a backend service.

## Connecting to the Rest of the System

- Imported from `src/` by `trading-mfe`, `orders-mfe`, `portfolio-mfe`, and `trader-ui` as `workspace:*`.
- Compiled to `dist/` and imported by all Node.js microservices (`execution-service`, `order-service`, `portfolio-service`, `notification-service`, `market-data-service`).
- **No dependencies on any other monorepo package** — intentional. This package is the foundation; nothing it imports can in turn import from `@pulsedesk/contracts` or a circular dependency results.

## Dependencies

### Runtime — zero

This package has **no runtime dependencies**. All exports are TypeScript `interface` and `type` declarations. TypeScript types are erased at compile time and produce no JavaScript output. Shipping runtime code in a contracts package would be a design smell: a contracts package that pulls in Zod, class-validator, or any other validation library makes itself a concern of every service's production bundle, adds version-management overhead, and blurs the boundary between "what shape is this?" (the contract) and "how do I validate it?" (the service's responsibility).

### Dev dependencies

| Package | Why |
|---|---|
| `typescript` | Compiles the TypeScript source to `dist/index.js` + `dist/index.d.ts` for Node.js backend service consumption. Frontend apps bypass `dist/` entirely and import TypeScript source directly via Vite. The compiler version is pinned at `~5.7.0` (older than the frontend apps' `~5.9.x`) to ensure the compiled CJS output is compatible with the widest range of Node.js service runtimes. |
| `eslint` + `@eslint/js` | Base ESLint rules for code quality. Catches unused exports and unreachable type branches before they propagate to every consumer. Chose the flat config (`eslint.config.js`) for forward compatibility with ESLint v9+. |
| `typescript-eslint` | TypeScript-aware ESLint rules. Enforces that exported types do not accidentally include `any` (which would silently propagate unsafety to all consumers), that interfaces follow naming conventions, and that no runtime code sneaks into the package. The `@typescript-eslint/no-explicit-any` rule is particularly important here: an `any` in a shared contract defeats the entire purpose of having typed contracts. |
