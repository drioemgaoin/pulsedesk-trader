# Decision Records

This directory contains all architecture and infrastructure decision records for the PulseDesk platform.

---

## What belongs here

| File prefix | Produced by | When |
|---|---|---|
| `ADR-*` | `@arch`, `@devops` | Any significant architecture, tooling, pattern, or infra decision |
| `DESIGN-*` | `@arch` | Substantial task design notes (Mode 2 output) when too large for the milestone Notes section |

> `@sec`, `@pm`, `@qa`, `@dev`, `@scrum` do not produce files here.
> Security findings are per-review artifacts. Product decisions live in `PROJECT.md` and milestone files.

---

## Naming convention

| Scope | Pattern | Example |
|---|---|---|
| Milestone + task | `ADR-M<n>-T<n>-<slug>.md` | `ADR-M2-T3-kafka-producer-config.md` |
| Milestone-wide | `ADR-M<n>-arch-<slug>.md` | `ADR-M2-arch-event-schema-versioning.md` |
| Cross-cutting / global | `ADR-global-<slug>.md` | `ADR-global-auth-strategy.md` |
| Task design note | `DESIGN-M<n>-T<n>-<slug>.md` | `DESIGN-M2-T3-tick-pipeline.md` |

---

## Update policy

ADRs are **immutable records of decisions made at a point in time**. Do not rewrite history.

| Scenario | Action |
|---|---|
| Decision is still valid, needs a minor factual clarification | Append a `## Clarification — YYYY-MM-DD` section at the bottom of the existing file |
| Decision changes or a better approach is adopted | Write a **new ADR**; set old ADR `Status` to `superseded` and add `Superseded by: <new-filename>`; new ADR header sets `Supersedes: <old-filename>` |
| Decision is abandoned or rolled back | Set `Status` to `superseded` or `rejected`; add a one-line note at the top explaining why — **do not delete the file** |

Design notes (`DESIGN-*`) are less formal:

| Scenario | Action |
|---|---|
| Minor update (no approach change) | Append a `## Revision — YYYY-MM-DD` section |
| Major rework of the approach | Create a new `DESIGN-*` file and add a link to it at the top of the original |

---

## Content structure

Use `ADR_TEMPLATE.md` in this directory for all `ADR-*` files.
