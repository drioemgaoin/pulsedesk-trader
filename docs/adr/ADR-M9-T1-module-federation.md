## Header

- **ADR ID:** `ADR-M9-T1-module-federation`
- **Title:** Activate Module Federation Phase 2 via `@originjs/vite-plugin-federation`
- **Date:** 2026-03-12
- **Status:** accepted
- **Owner:** @arch
- **Related milestone/task:** M9-T1
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** PROJECT.md § 6.5 deferred the Module Federation Phase 2 decision until a clear team-boundary or product justification existed. M9 introduces four distinct page domains (trading terminal, portfolio, orders management, load simulator), each with an independent data model, independent deployment lifecycle, and independent team ownership boundary. The user has explicitly requested a proper micro-frontend architecture. All three Phase 2 trigger criteria from PROJECT.md § 6.5 are satisfied.
- **Business/technical constraints:** All tooling must be free and self-hostable (PROJECT.md § 5.4). The platform runs as a Docker Compose stack — NGINX must serve all five static builds. No paid CDN or managed hosting.
- **Assumptions:** Vite is already the build tool for `apps/trader-ui`. `@originjs/vite-plugin-federation` supports Vite 5/6 and ES module federation without native federation (which requires browser `importmap` support or additional polyfilling).
- **What will fail if no decision is made:** All four new pages and the load simulator would be crammed into the existing `apps/trader-ui` monolith, violating FR-16 (MFE evolution readiness) and producing a build with no page-level code splitting boundary.

---

## Decision

- **Chosen option:** Adopt `@originjs/vite-plugin-federation` to implement the shell/remote decomposition described in `DESIGN-M9-T1-mfe-decomposition.md`.
- **Scope:**
  - Shell: `apps/trader-ui` configured as federation host; consumes four remotes
  - Four new Vite apps: `apps/trading-mfe`, `apps/portfolio-mfe`, `apps/orders-mfe`, `apps/simulator-mfe`; each configured as a federation remote exposing one root page component
  - Shared singleton packages declared in every `vite.config.ts` (see design note § 3)
  - Local dev: five independent `vite dev` processes; shell resolves remotes from `VITE_*` env vars
  - Production: single NGINX container serves all five static build outputs; shell loads `remoteEntry.js` from NGINX sub-paths at runtime
- **Non-goals:**
  - Native browser importmap-based federation
  - Federated TypeScript type sharing at runtime (types shared via `packages/contracts/`)
  - Cross-remote direct component import (remotes are page-level boundaries only)

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|--------|------|------|-----------------|
| Path-alias-only feature isolation (remain monolith) | No build complexity; single deploy | No runtime independence; no isolated test/deploy per page domain; violates FR-16 | Does not satisfy the user's explicit MFE requirement |
| Native Module Federation (webpack) | Mature, widely documented | Requires migrating from Vite to webpack — major build tool regression; loses HMR speed advantage | Build tool change is a disproportionate cost |
| Module Federation with `@module-federation/vite` | More recently active project | Less battle-tested than `@originjs/vite-plugin-federation`; API surface in flux as of M9 planning date | Risk of mid-milestone API churn |
| Single Vite app with lazy-loaded route chunks | Simple; Vite splits chunks per route automatically | No deployment independence; no runtime host/remote boundary; not a true MFE | Does not satisfy the micro-frontend architectural requirement |

---

## Consequences

- **Positive outcomes:**
  - Each page domain can be developed, built, and deployed independently
  - A failed remote does not crash the shell or sibling routes (isolated via `react-error-boundary`)
  - Shared singleton packages (React, MUI, RTK, TanStack Query) are loaded once — no duplication overhead
  - Clean separation of data-domain ownership per remote
- **Negative outcomes:**
  - `vite-plugin-federation` requires specific Vite config flags (`target: 'es2020'`, `format: 'esm'`) — additional build configuration surface
  - Local dev requires five terminal processes (mitigated by workspace `dev` script)
  - CI build matrix grows from 1 to 5 apps (mitigated by T4 devops task)
- **Risks introduced:**
  - Singleton version mismatch silently loads two React instances → Hooks invariant violation
  - Dev/prod federation behaviour divergence (dynamic import URL resolution)
- **Risk mitigations:**
  - pnpm workspace enforces exact version pinning across all five `package.json` files
  - CI smoke test verifies `remoteEntry.js` loads from NGINX container after full build
  - Shell-level and per-remote `ErrorBoundary` contain all remote loading failures

---

## Implementation and Migration

- **Required code/config/doc updates:**
  - Create four new pnpm workspace packages under `apps/`
  - Update `apps/trader-ui/vite.config.ts` to federation host config
  - Add `VITE_*` remote URL env vars to `.env.example`
  - Update Docker Compose to add NGINX container (T4)
  - Update CI build matrix to cover all five apps (T4)
- **Migration/backfill steps:** Existing `apps/trader-ui/src/features/` panels are moved into `apps/trading-mfe/src/features/` in T6. No data migration required — all state is ephemeral (Redux in-memory, TanStack Query cache).
- **Rollback strategy:** If Module Federation proves unresolvable, revert to a single Vite app with route-based lazy loading. The feature-directory structure is compatible with either approach.

---

## Impact Assessment

- **Clean architecture/layering impact:** Enforces a hard boundary between page domains — no cross-feature imports can cross the remote boundary. Each remote must own its feature layer (ui/hooks/api/types) internally.
- **Reliability impact:** Per-remote `react-error-boundary` provides fault isolation. No retry/circuit-breaker pattern needed for static asset loading — browser retry on refresh is sufficient.
- **Graceful shutdown/lifecycle impact:** Frontend has no SIGTERM receiver. Tab close triggers `useEffect` cleanup functions (WS unsubscribe, query cache clear on logout). No additional lifecycle handling required.
- **Security impact:** All remotes served from same NGINX origin — no CORS policy needed for `remoteEntry.js`. Dynamic `import()` — no `eval` or `innerHTML` — no CSP relaxation required.
- **Observability impact:** No additional observability infrastructure required. TanStack Query Devtools + browser DevTools sufficient for M9 scope.
- **Performance/scale impact:** Shared singletons ensure React, MUI, RTK are loaded once. Per-route lazy loading keeps initial shell bundle minimal. Simulator remote (heaviest — TanStack Virtual + chart) only loaded on `/simulator` navigation.
- **Licensing and self-hosting impact:** `@originjs/vite-plugin-federation` is MIT licensed. No paid dependency introduced.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints (FR-16, § 6.5)
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit
- [x] Approval recorded (@arch)
