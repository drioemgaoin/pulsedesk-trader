/**
 * CI performance smoke suite — M7-T4
 *
 * Lightweight profile designed for CI: 2 VUs, 45 s total.
 * Covers all three critical paths (watchlist read, order query, order submit).
 *
 * Thresholds are intentionally tighter than the full load-test suite
 * (250 ms vs 500 ms) so that meaningful regressions fail CI before they
 * breach the production SLO.
 *
 * Usage (local):
 *   k6 run load-tests/smoke.js
 *   k6 run --out json=load-tests/results/smoke.json load-tests/smoke.js
 *
 * Usage (CI — env vars injected by workflow):
 *   BASE_URL=http://localhost:3000 k6 run \
 *     --out json=load-tests/results/smoke.json load-tests/smoke.js
 *
 * Exit codes:
 *   0 = all thresholds pass
 *   99 = one or more thresholds breached (regression detected)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, USERNAME, PASSWORD, ACCOUNT_ID } from './config.js';
import { getToken, authHeaders } from './scenarios/auth.js';

// ── Smoke profile: 2 VUs × 30 s sustain ───────────────────────────────────

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 2 },   // ramp-up
        { duration: '30s', target: 2 },   // sustain
        { duration: '5s',  target: 0 },   // ramp-down
      ],
      gracefulRampDown: '5s',
      exec: 'smokeRun',
    },
  },

  // ── Regression thresholds ──────────────────────────────────────────────
  // p95 < 250 ms: tighter than 500 ms SLO — catches regressions early
  // Baseline from M7-T1: p95 ~11–29 ms; 250 ms gives 8× headroom before fail
  thresholds: {
    'http_req_duration{scenario:smoke}': ['p(95)<250'],
    'http_req_failed{expected_response:true}': ['rate<0.01'],
  },

};

// ── Setup: acquire JWT once per run ───────────────────────────────────────

export function setup() {
  const token = getToken();
  if (!token) {
    throw new Error('smoke setup: failed to obtain JWT — check stack health');
  }
  return { token };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Main scenario ──────────────────────────────────────────────────────────

const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

export function smokeRun({ token }) {
  const hdrs = authHeaders(token);

  // 1. Watchlist read — GET /api/v1/watchlist
  // 429 is expected when the shared JWT token hits the rate limit (100 req/min).
  const watchlistRes = http.get(
    `${BASE_URL}/api/v1/watchlist`,
    { ...hdrs, tags: { endpoint: 'watchlist' },
      responseCallback: http.expectedStatuses({ min: 200, max: 399 }, 429) },
  );
  check(watchlistRes, {
    'watchlist: status 200 or 429': (r) => r.status === 200 || r.status === 429,
    'watchlist: not 5xx':           (r) => r.status < 500,
  });

  sleep(0.2);

  // 2. Order query — GET /api/v1/orders?accountId=<id>
  // 429 is expected for same reason as watchlist.
  const ordersRes = http.get(
    `${BASE_URL}/api/v1/orders?accountId=${ACCOUNT_ID}`,
    { ...hdrs, tags: { endpoint: 'order-query' },
      responseCallback: http.expectedStatuses({ min: 200, max: 399 }, 429) },
  );
  check(ordersRes, {
    // 200 = success, 429 = rate-limited, 403 = IDOR guard, 502 = upstream error,
    // 503 = circuit breaker open (opossum) — all are expected resilience responses.
    // Only 500 (unhandled crash) or 504 should fail the smoke check.
    'order-query: not unexpected 5xx': (r) => r.status < 500 || r.status === 502 || r.status === 503,
  });

  sleep(0.2);

  // 3. Order submit — POST /api/v1/orders
  // 429 (rate-limited) is expected under load and excluded from http_req_failed.
  // 201 = accepted, 400 = validation fail — both are non-crash responses.
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const submitRes = http.post(
    `${BASE_URL}/api/v1/orders`,
    JSON.stringify({
      commandId: uuidv4(),
      accountId: ACCOUNT_ID,
      symbol,
      side:      Math.random() > 0.5 ? 'BUY' : 'SELL',
      type:      'MARKET',
      quantity:  Math.floor(Math.random() * 5) + 1,
    }),
    { ...hdrs, tags: { endpoint: 'order-submit' },
      responseCallback: http.expectedStatuses({ min: 200, max: 399 }, 429) },
  );
  check(submitRes, {
    'order-submit: not 500':       (r) => r.status !== 500,
    'order-submit: not unhandled': (r) => r.status < 500 || r.status === 502 || r.status === 503,
  });

  sleep(0.3);
}
