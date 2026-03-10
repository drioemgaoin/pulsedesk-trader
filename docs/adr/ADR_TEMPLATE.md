# Architecture Decision Record (ADR) Template

Use this template for any architecture, tooling, or infrastructure decision.
See `README.md` in this directory for naming convention and update policy.

## Header

- **ADR ID:** `ADR-M<n>-T<n>-<slug>`
- **Title:** `<short decision title>`
- **Date:** `YYYY-MM-DD`
- **Status:** `proposed | accepted | rejected | superseded`
- **Owner:** `@arch` | `@devops`
- **Related milestone/task:** `<id>`
- **Supersedes:** `<ADR id or none>`
- **Superseded by:** `<ADR id or none>`

---

## Context

- **Problem statement:**
- **Business/technical constraints:**
- **Assumptions:**
- **What will fail if no decision is made:**

---

## Decision

- **Chosen option:**
- **Scope (what is included):**
- **Non-goals (what is not included):**

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| A | | | |
| B | | | |

---

## Consequences

- **Positive outcomes:**
- **Negative outcomes:**
- **Risks introduced:**
- **Risk mitigations:**

---

## Implementation and Migration

- **Required code/config/doc updates:**
- **Migration/backfill steps (if any):**
- **Rollback strategy:**

---

## Impact Assessment

- Clean architecture/layering impact:
- Reliability impact (timeouts/retries/idempotency/backpressure):
- Graceful shutdown/lifecycle impact:
- Security impact:
- Observability impact:
- Performance/scale impact:
- Licensing and self-hosting impact:

---

## Decision Checklist

- [ ] Aligns with `PROJECT.md` goals/constraints
- [ ] Preserves or improves architecture quality in `ARCHITECTURE.md`
- [ ] No mandatory paid service introduced
- [ ] Security/reliability/operability impact documented
- [ ] Migration and rollback paths are explicit
- [ ] Approval recorded (`@arch` or `@devops` + relevant role owners)
