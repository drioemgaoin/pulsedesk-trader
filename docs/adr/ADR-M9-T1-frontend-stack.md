## Header

- **ADR ID:** `ADR-M9-T1-frontend-stack`
- **Title:** Frontend library stack additions for M9 — React Router v7, MUI v6, TanStack Table v8, MSW v2, RTK retained
- **Date:** 2026-03-12
- **Status:** accepted
- **Owner:** @arch
- **Related milestone/task:** M9-T1
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** PROJECT.md § 5.2 was incomplete at M9 planning time: it listed React and Vite but omitted routing, a concrete component library version, a headless table solution, and an API mocking strategy. M9 introduces four pages requiring routing, a data-dense design system, a paginated sortable orders table, and a full frontend test suite. Each gap must be resolved by an explicit decision before T5 (@dev) begins.
- **Constraints:** Free and self-hostable only (§ 5.4). No commercial license dependencies. Consistency with the TanStack ecosystem already adopted for Query.

---

## Decision 1 — React Router v7

- **Chosen option:** `react-router-dom` v7.
- **Rationale:** Most widely adopted React routing library. v7 (released late 2024) consolidates the Remix/React Router split, adds first-class framework features, and provides type-safe route definitions. No competing routing library in the React ecosystem approaches its adoption or documentation depth.
- **Rejected alternatives:** TanStack Router (newer, less ecosystem maturity for MFE patterns), Next.js App Router (framework-level; incompatible with Vite + pure SPA model).
- **PROJECT.md update:** § 5.2 row "Routing" added: `React Router v7`.

---

## Decision 2 — MUI v6 (upgrade from v5 spec)

- **Chosen option:** `@mui/material` v6.
- **Rationale:** v6 was released mid-2024. Key improvements relevant to this project: piggyback-free slot system (cleaner component overrides), improved TypeScript support, better theme token structure. v5 was the original spec but v6 is now the stable release — adopting v5 at greenfield start would immediately introduce debt.
- **Rejected alternatives:** Chakra UI (less adopted for data-dense enterprise apps), Ant Design (heavier bundle, different design language), shadcn/ui (requires Tailwind CSS — conflicts with MUI token system already specified in T2).
- **PROJECT.md update:** § 5.2 row "UI system" updated to `MUI v6`.

---

## Decision 3 — TanStack Table v8 (headless, no MUI DataGrid)

- **Chosen option:** `@tanstack/react-table` v8 (headless) + MUI `Table` primitives for rendering.
- **Rationale:** The Orders page (T9) requires server-side pagination, multi-column filtering, row expand/collapse, and per-row action buttons. MUI DataGrid supports all of these but the advanced features (server-side pagination, multi-column filters) require `@mui/x-data-grid-pro` — a commercial license. TanStack Table v8 is the most adopted headless table library, is MIT-licensed, integrates naturally with MUI Table primitives, and fits the TanStack ecosystem already adopted for Query and Virtual.
- **Rejected alternatives:** MUI DataGrid Community edition (missing server-side pagination and multi-column filter without Pro license), react-table v7 (superseded by v8 with breaking API changes), AG Grid Community (large bundle, different API surface from TanStack ecosystem).
- **PROJECT.md update:** § 5.2 row "Table" added: `TanStack Table v8 (headless)`.

---

## Decision 4 — MSW v2 as test API mocking strategy

- **Chosen option:** `msw` v2 (Mock Service Worker).
- **Rationale:** MSW intercepts HTTP requests at the network level (Service Worker in browser, `http` interceptor in Node/Vitest) rather than mocking `fetch` or `axios`. This means tests exercise the full data-fetching stack including TanStack Query, request serialization, and error handling — not a mock of the internal calling mechanism. MSW v2 is the industry standard for TanStack Query test patterns. It eliminates the `global.fetch = jest.fn()` antipattern that is fragile and does not catch request construction errors.
- **Rejected alternatives:** `jest.spyOn(global, 'fetch')` (shallow mock, brittle, misses serialization bugs), `axios-mock-adapter` (axios not in this stack), Nock (Node-only, incompatible with browser-environment Vitest tests).
- **PROJECT.md update:** § 5.2 row "API mocking (tests)" added: `MSW v2 (Mock Service Worker)`.

---

## Decision 5 — Redux Toolkit retained (Zustand not adopted)

- **Chosen option:** Retain Redux Toolkit for global app state.
- **Rationale:** RTK is already in the approved stack and consistent with backend-team familiarity signals in PROJECT.md. The app-state surface in M9 is small: `authSlice` (token, status) + `terminalSlice` (selectedSymbol). This is well within RTK's strength. Adopting Zustand would save ~5 lines of boilerplate per slice at the cost of introducing a second state management dependency, a new ADR, and a team learning curve. The Module Federation singleton pattern also works cleanly with RTK's `useSelector`/`useDispatch` hooks across remotes — Zustand stores would need explicit context bridging across the MFE boundary.
- **Rejected alternatives:** Zustand (lighter, but not justified by the current state surface; would require a separate ADR; cross-MFE sharing is less established), React Context (appropriate only for theme/locale; not suitable for cross-remote auth state that must survive re-renders efficiently).

---

## Consequences

- **Positive:** Entire frontend stack is now fully specified, MIT-licensed, self-hostable, and internally consistent within the TanStack + MUI + RTK ecosystem. No commercial licenses required.
- **Negative:** Five additional dependencies beyond the original PROJECT.md spec. `@tanstack/react-table` adds ~15KB gzipped to the orders-mfe bundle. MSW requires a Service Worker registration step in the browser (dev-only — not served in production).
- **Risks:** None beyond standard major-version upgrade considerations. All packages are stable releases.

---

## Impact Assessment

- **Clean architecture/layering impact:** No change to layering rules. All decisions are library-level within the approved frontend clean architecture (§ 9.4).
- **Reliability impact:** MSW makes tests more reliable by eliminating shallow mocks. No runtime reliability impact.
- **Security impact:** None. All packages are client-side only.
- **Observability impact:** None.
- **Performance/scale impact:** TanStack Table is headless — zero additional DOM nodes beyond what MUI renders. MSW is dev-only — zero production bundle impact.
- **Licensing and self-hosting impact:** All MIT-licensed. MUI DataGrid Pro (commercial) explicitly avoided.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit (greenfield additions — no rollback complexity)
- [x] Approval recorded (@arch)
