/**
 * M7-T1 API load-test suite
 *
 * Runs all three scenario groups (watchlist reads, order query, order submit)
 * in a single k6 run with baseline and stress phases.
 *
 * Usage:
 *   k6 run load-tests/suite.js
 *   k6 run --out json=load-tests/results/latest.json load-tests/suite.js
 *
 * Override defaults:
 *   BASE_URL=http://localhost:3000 DEMO_USERNAME=trader DEMO_PASSWORD=pulsedesk \
 *     k6 run load-tests/suite.js
 *
 * Profiles:
 *   baseline  — 10 VUs × 20 s sustain   (normal operating load)
 *   stress    — 50 VUs × 20 s sustain   (peak/overload validation)
 *
 * SLO thresholds (fail the run if breached):
 *   p95 latency < 500 ms  (baseline scenarios)
 *   p95 latency < 2 000 ms (stress scenarios)
 *   error rate  < 1%
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ACCOUNT_ID, THRESHOLDS } from './config.js';
import { getToken, authHeaders } from './scenarios/auth.js';

const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

function randomOrder() {
  return JSON.stringify({
    symbol:    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    side:      Math.random() > 0.5 ? 'BUY' : 'SELL',
    orderType: 'MARKET',
    quantity:  Math.floor(Math.random() * 10) + 1,
  });
}

export const options = {
  scenarios: {
    // ── Baseline: normal operating load ──────────────────────────────────
    watchlist_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      exec: 'watchlist',
      tags: { scenario: 'watchlist_baseline' },
    },
    order_query_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      exec: 'orderQuery',
      tags: { scenario: 'order_query_baseline' },
    },
    order_submit_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5  },
        { duration: '20s', target: 5  },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      exec: 'orderSubmit',
      tags: { scenario: 'order_submit_baseline' },
    },

    // ── Stress: peak / overload ───────────────────────────────────────────
    watchlist_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '40s',
      stages: [
        { duration: '10s', target: 50 },
        { duration: '20s', target: 50 },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      exec: 'watchlist',
      tags: { scenario: 'watchlist_stress' },
    },
    order_query_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '40s',
      stages: [
        { duration: '10s', target: 50 },
        { duration: '20s', target: 50 },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      exec: 'orderQuery',
      tags: { scenario: 'order_query_stress' },
    },
    order_submit_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '40s',
      stages: [
        { duration: '10s', target: 20 },
        { duration: '20s', target: 20 },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      exec: 'orderSubmit',
      tags: { scenario: 'order_submit_stress' },
    },
  },
  thresholds: THRESHOLDS,
};

export function setup() {
  return { token: getToken() };
}

// ── Scenario functions ────────────────────────────────────────────────────────

// Tell k6 that 429 (rate-limited) is an expected, non-failed response.
// http_req_failed will only count 5xx as failures, not rate-limit rejections.
const EXPECTED = { responseCallback: http.expectedStatuses({ min: 200, max: 399 }, 429) };

export function watchlist(data) {
  const opts = Object.assign({}, authHeaders(data.token), EXPECTED);
  const res = http.get(`${BASE_URL}/api/v1/watchlist`, opts);
  check(res, {
    'watchlist: 200 or 429':       (r) => r.status === 200 || r.status === 429,
    'watchlist: not 5xx':          (r) => r.status < 500,
    'watchlist: quotes when 200':  (r) => r.status !== 200 || Array.isArray(r.json('quotes')),
  });
  sleep(0.5);
}

export function orderQuery(data) {
  const opts = Object.assign({}, authHeaders(data.token), EXPECTED);
  const res = http.get(
    `${BASE_URL}/api/v1/orders?accountId=${ACCOUNT_ID}`,
    opts,
  );
  check(res, {
    'order-query: not 5xx': (r) => r.status < 500,
  });
  sleep(0.5);
}

export function orderSubmit(data) {
  const opts = Object.assign({}, authHeaders(data.token), EXPECTED);
  const res = http.post(
    `${BASE_URL}/api/v1/orders`,
    randomOrder(),
    opts,
  );
  check(res, {
    'order-submit: not 5xx': (r) => r.status < 500,
  });
  sleep(1);
}

// default export required even when all work is in named exports
export default function () {}
