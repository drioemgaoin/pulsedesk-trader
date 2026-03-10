# Test Plan — <title>

- **TP ID:** `TP-M<n>-T<n>-<slug>`
- **Date:** `YYYY-MM-DD`
- **Last updated:** `YYYY-MM-DD`
- **Status:** `draft | active | superseded`
- **Owner:** `@qa`
- **Related milestone/task:** `<id>`
- **Verdict:** `PASS | BLOCK | PENDING`

---

## Scope

- **In scope:** <what is tested>
- **Out of scope:** <explicitly excluded>
- **Prerequisites:** <unit tests passing, stack running, seed data, etc.>

---

## Test Cases

### Integration

| ID | Scenario | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| INT-01 | | | | | Pass/Fail |

### End-to-End

| ID | Scenario | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| E2E-01 | | | | | Pass/Fail |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | | | Pass/Fail |

### Resilience / Edge Cases

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | | | | Pass/Fail |

### Performance Baseline

| Metric | Target | Actual | Status |
|---|---|---|---|
| | | | Pass/Fail |

---

## Findings

| ID | Severity | Description | Status |
|---|---|---|---|
| | CRITICAL/HIGH/MEDIUM/LOW | | Open/Fixed |

---

## Verdict

`PASS` — all test cases pass, no open MEDIUM+ findings.
`BLOCK` — one or more test cases fail or MEDIUM+ finding is open.

**Final verdict:** `PENDING`

---

## Evidence

- Unit test run: `<pnpm test output summary>`
- Integration run: `<docker compose service logs or curl output>`
- Load test: `<k6 summary if applicable>`
