# Test Plans

Test plans produced by `@qa` for milestone tasks.

## When to produce one

A test plan is required for every task that goes through `@qa validate T<n>`.
It documents what is tested, the approach, and records the outcome — serving as evidence for DoD sign-off.

## Naming convention

| Scope | Pattern | Example |
|---|---|---|
| Task | `TP-M<n>-T<n>-<slug>.md` | `TP-M2-T2-market-data-tick-ingestion.md` |

## Update policy

Test plans are **living documents** for the lifetime of the task.

| Scenario | Action |
|---|---|
| Adding new test cases during validation | Edit in place; update `Last updated` date |
| Re-validation after a fix loop | Append a `## Re-validation — YYYY-MM-DD` section with updated results |
| Task is superseded or removed | Mark `Status: superseded` — do not delete |

## Content structure

Use `TEST_PLAN_TEMPLATE.md` in this directory.
