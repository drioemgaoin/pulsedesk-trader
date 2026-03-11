# Test Plan — M4-T4: UI Blotter and Positions Integration

**Milestone:** M4 — Order Ticket & Blotter
**Task:** T4 — UI displays real-time blotter and positions from notification/query services
**Author:** @qa
**Date:** 2026-03-11
**Status:** PASS

---

## Scope

Validate that:
1. The BlotterPanel and PositionsPanel render correct data from the polling API client.
2. Status and PnL values update semantically (correct colors, prefixes).
3. Error, empty, and stale states are handled gracefully without manual refresh.
4. The `GET /v1/orders?accountId=` contract is correct and validates its input.
5. The OrderTicketPanel form behaves correctly across order types and API outcomes.

## Out of Scope

- End-to-end browser tests (no running services required).
- api-gateway integration with live order-service.
- Real-time WebSocket/Kafka notification paths (covered by M3 tests).

---

## Acceptance Criteria Mapping

| AC | Test File | Status |
|----|-----------|--------|
| UI displays real-time blotter from polling | `BlotterPanel.integration.spec.tsx` | PASS |
| UI displays real-time positions from polling | `PositionsPanel.integration.spec.tsx` | PASS |
| Status values update without manual refresh | BlotterPanel polling tests | PASS |
| PnL values update without manual refresh | PositionsPanel polling tests | PASS |
| Dense-table readability / semantic coloring | Status chip + PnL color tests | PASS |

---

## Test Files

### `apps/trader-ui/src/features/orders/BlotterPanel.integration.spec.tsx`

**Scenarios covered:**

| # | Scenario | Expected Outcome |
|---|----------|-----------------|
| 1 | Poll returns multiple orders | All rows rendered with correct symbol, quantity, limit price, and type values |
| 2 | MARKET order has no limit price | Em-dash displayed in Limit Price column |
| 3 | LIMIT order has a limit price | Price formatted to 2 decimal places |
| 4 | Poll returns empty array | "No orders yet." empty state message visible |
| 5 | Empty state | No data rows rendered |
| 6 | API throws on every attempt | Error banner "Failed to load orders." shown after 3 consecutive failures |
| 7 | Error state | No order rows present alongside error banner |
| 8 | Page hidden (15s interval) + 1 failure after 15s age | "stale" badge rendered |
| 9 | Status = PENDING | Gray chip (`bg-zinc-800 text-zinc-400`) |
| 10 | Status = ACCEPTED | Blue chip (`bg-blue-900/30 text-blue-400`) |
| 11 | Status = FILLED | Green chip (`bg-green-900/30 text-green-400`) |
| 12 | Status = REJECTED | Red chip (`bg-red-900/30 text-red-400`) |
| 13 | Status = CANCELLED | Gray chip (`bg-zinc-800 text-zinc-400`) |

### `apps/trader-ui/src/features/portfolio/PositionsPanel.integration.spec.tsx`

**Scenarios covered:**

| # | Scenario | Expected Outcome |
|---|----------|-----------------|
| 1 | Position with positive unrealizedPnl | Row PnL cell has `text-green-400` class |
| 2 | Position with positive unrealizedPnl | Value prefixed with `+` |
| 3 | Position with negative unrealizedPnl | Row PnL cell has `text-red-400` class |
| 4 | Negative PnL | No `+` prefix on negative value |
| 5 | Mixed positions (positive + negative) | Each row colored independently |
| 6 | Total unrealizedPnl positive | Footer total cell `text-green-400` |
| 7 | Total unrealizedPnl negative | Footer total cell `text-red-400` |
| 8 | Empty positions array | "No positions." empty state visible |
| 9 | Empty positions | Total PnL footer absent |
| 10 | API throws on every attempt | "Failed to load positions." error after 3 failures |
| 11 | Error state | No position rows rendered |

### `apps/trader-ui/src/features/orders/OrderTicketPanel.integration.spec.tsx`

**Scenarios covered:**

| # | Scenario | Expected Outcome |
|---|----------|-----------------|
| 1 | LIMIT type selected | Limit Price input field visible |
| 2 | LIMIT without price submitted | Validation error "Limit price required" shown, submitOrder not called |
| 3 | MARKET type selected (default) | Limit Price field absent |
| 4 | Switch from LIMIT → MARKET | Limit Price field removed |
| 5 | API returns `ApiError` with message | Error message displayed to user |
| 6 | Non-Error rejection (string thrown) | Fallback "Request failed — try again" shown |
| 7 | Submission fails | Form fields retain their values |
| 8 | MARKET order succeeds | Symbol field reset to empty |
| 9 | MARKET order succeeds | Quantity field reset |
| 10 | LIMIT order succeeds | Form resets to MARKET type (limit price field disappears) |
| 11 | Success after prior failure | Previous error message cleared |

### `services/order-service/src/interfaces/http/orders.controller.contract.spec.ts`

**Scenarios covered:**

| # | Scenario | Expected Outcome |
|---|----------|-----------------|
| 1 | `accountId` provided | Returns `OrderResponseDto[]` array |
| 2 | `accountId` provided | Use case called with exact accountId |
| 3 | Account with no orders | Returns empty array |
| 4 | Response shape | `id` field present and correct |
| 5 | Response shape | `commandId` field present and correct |
| 6 | Response shape | `status` is a string matching domain enum |
| 7 | Response shape | `side` field present |
| 8 | Response shape | `type` field present |
| 9 | Response shape | `quantity` is a number |
| 10 | Response shape | `createdAt` is an ISO-8601 string |
| 11 | Response shape | `updatedAt` is an ISO-8601 string |
| 12 | LIMIT order | `limitPrice` is a number |
| 13 | MARKET order | `limitPrice` is `null` |
| 14 | Multiple orders | All orders returned in array |
| 15 | Multiple orders | All required fields present on every DTO |
| 16 | `accountId` missing (undefined) | Throws `BadRequestException` |
| 17 | `accountId` missing | Use case not called |
| 18 | `accountId` empty string | Throws `BadRequestException` |
| 19 | `accountId` empty string | Use case not called |
| 20 | `accountId` whitespace only | Throws `BadRequestException` |

---

## Risk Notes

- **Stale state** relies on the hidden-page 15-second timer path. The 5-second visible-page interval cannot reach the 15-second stale threshold before hitting the 3-failure error threshold. The stale badge requires a poll gap > 15 seconds, achievable only via the hidden-page backoff or a very slow network. Tested using `document.visibilityState = 'hidden'` mock.
- **PnL aria-labels** are shared between row cells and the footer cell; tests use `getAllByLabelText` and assert on the first element (row cell).
- The `act()` warning in `OrderTicketPanel.spec.tsx` (pre-existing) is a known issue in the dev-written unit tests and is not a regression.

---

## Test Counts

| Suite | New QA Tests | Total After |
|-------|-------------|-------------|
| `@pulsedesk/trader-ui` | 36 | 59 |
| `@pulsedesk/order-service` | 20 | 119 |
| **Total** | **56** | **178** |
