# Threat Model — <title>

- **TM ID:** `TM-M<n>-T<n>-<slug>`
- **Date:** `YYYY-MM-DD`
- **Last reviewed:** `YYYY-MM-DD`
- **Status:** `draft | active | retired`
- **Owner:** `@sec`
- **Related milestone/task:** `<id>`

---

## Scope

- **In scope:** <services, endpoints, data flows covered>
- **Out of scope:** <explicitly excluded>

---

## Architecture Overview

Brief description of the component(s) being modelled. Include:
- Trust boundaries (what is internal vs external)
- Entry points (APIs, events, UI)
- Data stores and sensitive data handled
- Key actors (end user, internal service, external system)

---

## STRIDE Threat Analysis

For each identified threat, classify using STRIDE:

| ID | Category | Threat | Asset at risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|---|---|
| T01 | Spoofing | ... | | Low/Med/High | Low/Med/High | ... | Open/Mitigated |
| T02 | Tampering | ... | | | | ... | |
| T03 | Repudiation | ... | | | | ... | |
| T04 | Information Disclosure | ... | | | | ... | |
| T05 | Denial of Service | ... | | | | ... | |
| T06 | Elevation of Privilege | ... | | | | ... | |

**STRIDE categories:**
- **S**poofing — impersonating a user or system
- **T**ampering — modifying data or code
- **R**epudiation — denying an action occurred
- **I**nformation Disclosure — exposing data to unauthorised parties
- **D**enial of Service — making a service unavailable
- **E**levation of Privilege — gaining unauthorised permissions

---

## Open Risks

Threats that are identified but not yet mitigated:

| ID | Threat | Owner | Target date |
|---|---|---|---|
| | | | |

---

## Mitigations Implemented

Summary of controls already in place:

- <control description> — <where implemented>

---

## Assumptions

- <assumption>

---

## References

- Related ADRs: <links>
- OWASP references: <links>
