# Design Decision Records (DDRs)

UX and design decisions produced by `@design`.
Equivalent to ADRs but for interaction design, layout, and UX pattern choices.

## When to produce one

A DDR is required when a significant design decision is made:
- A new screen, view, or user flow is introduced
- A UX pattern is chosen over alternatives (e.g. table vs list, modal vs drawer)
- A design system decision affects multiple components
- An interaction or state behaviour is non-obvious and the rationale needs to be recorded

Minor style tweaks do not require a DDR.

## Naming convention

| Scope | Pattern | Example |
|---|---|---|
| Milestone + task | `DDR-M<n>-T<n>-<slug>.md` | `DDR-M2-T4-watchlist-layout.md` |
| Design system / global | `DDR-global-<slug>.md` | `DDR-global-data-table-pattern.md` |

## Update policy

DDRs follow the same immutability rule as ADRs:

| Scenario | Action |
|---|---|
| Minor clarification | Append a `## Clarification — YYYY-MM-DD` section |
| Design decision changes | Write a **new DDR** that supersedes the old one; mark old DDR `Status: superseded` with `Superseded by:` link |
| Feature removed | Mark `Status: superseded` — do not delete |

## Content structure

Use `DDR_TEMPLATE.md` in this directory.
