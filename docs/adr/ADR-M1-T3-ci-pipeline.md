# ADR-M1-T3 — CI pipeline (GitHub Actions, pnpm cache, compose smoke test)

- **ADR ID:** `ADR-M1-T3-ci-pipeline`
- **Date:** `2026-03-09`
- **Status:** `accepted`
- **Owner:** `@devops`
- **Related milestone/task:** M1-T3
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **Problem statement:** Establish a CI pipeline that enforces code quality gates (lint, test, build) and verifies the full local stack boots correctly on every push.
- **Constraints:** Must use a free CI platform. Must cache dependencies to keep pipeline fast. Must catch broken Docker builds before they reach developers.

---

## Decision

- **Chosen approach:** GitHub Actions with four jobs: `lint` → `test` → `build` (chained via `needs`, fail-fast) + `compose-smoke` (runs after `build`). pnpm dependency caching via `actions/setup-node` with `cache: pnpm`. Concurrency block cancels stale runs on the same ref.
- **Scope:** All services and packages in the monorepo.
- **Non-goals:** Deployment pipeline, staging promotion, performance regression CI (later milestone).

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| CircleCI | Good caching, Docker support | Paid for parallel jobs beyond free tier limits | GitHub Actions is free for public repos and sufficient here |
| Nx affected-only runs | Only test changed packages | Adds Nx dependency and config overhead | Premature optimisation at M1; all packages build fast |
| Separate lint/test/build workflows | Cleaner separation | More files, harder to reason about order | Single workflow with `needs` chain is simpler and explicit |

---

## Consequences

- **Positive:** Every PR is validated end-to-end including Docker build and compose startup. Fail-fast on lint/test prevents wasted build time.
- **Negative:** Compose smoke test cannot run locally (requires Docker daemon in CI runner). Must be verified by pushing to GitHub.
- **Risks:** Compose smoke adds ~5min to pipeline on cold start.
- **Risk mitigations:** Compose smoke only runs after `build` succeeds. `docker compose down` always runs in the smoke job (even on failure) to clean up.

---

## Impact Assessment

- **Reliability:** Broken builds caught before merge. Health check wait loop (300s timeout on gateway `/health`) handles slow Kafka startup.
- **Security:** No secrets required in CI for M1 (using default env values). Secret scanning can be added as a job in a later milestone.
- **Licensing:** GitHub Actions (free tier) — no mandatory paid service.

---

## Decision Checklist

- [x] Aligns with `PROJECT.md` goals/constraints
- [x] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [x] No mandatory paid service introduced
- [x] Security/reliability/operability impact documented
- [x] Migration and rollback paths are explicit
- [x] Approval recorded (`@devops`)
