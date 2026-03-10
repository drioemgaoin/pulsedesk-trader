# Threat Models

Security threat models produced by `@sec` for new services and significant features.

## When to produce one

A threat model is required when:
- A new service is introduced
- A new authentication/authorisation boundary is added
- A new external-facing API or event stream is introduced
- A significant data flow or storage component changes

Minor bug fixes and internal refactors do not require a threat model.

## Naming convention

| Scope | Pattern | Example |
|---|---|---|
| Milestone + task | `TM-M<n>-T<n>-<slug>.md` | `TM-M2-T1-api-gateway-auth.md` |
| Service-wide | `TM-M<n>-<service>-<slug>.md` | `TM-M2-market-data-service.md` |

## Update policy

Threat models are **living documents** — they are updated as the system evolves.

| Scenario | Action |
|---|---|
| Minor clarification or finding added | Edit in place; update `Last reviewed` date in the header |
| Significant change to trust boundaries or data flows | Append a `## Revision — YYYY-MM-DD` section describing what changed and why |
| Service is retired | Mark `Status: retired` in the header — do not delete |

## Content structure

Use `THREAT_MODEL_TEMPLATE.md` in this directory.
