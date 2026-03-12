/**
 * Scenario: watchlist reads
 *
 * Covers: GET /api/v1/watchlist — highest-frequency read path, served from
 * 1 s Valkey cache. Validates throughput and p95 latency under baseline and
 * stress VU counts.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ACCOUNT_ID, THRESHOLDS } from '../config.js';
import { getToken, authHeaders } from './auth.js';

export const options = {
  scenarios: {
    watchlist_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },  // ramp up
        { duration: '20s', target: 10 },  // sustain
        { duration: '5s',  target: 0  },  // ramp down
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'watchlist_baseline' },
    },
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
      tags: { scenario: 'watchlist_stress' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:watchlist_baseline}': THRESHOLDS['http_req_duration{scenario:watchlist_baseline}'],
    'http_req_duration{scenario:watchlist_stress}':   THRESHOLDS['http_req_duration{scenario:watchlist_stress}'],
    'http_req_failed': THRESHOLDS['http_req_failed'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const res = http.get(
    `${BASE_URL}/api/v1/watchlist`,
    authHeaders(data.token),
  );
  check(res, {
    'watchlist: status 200':       (r) => r.status === 200,
    'watchlist: has quotes array': (r) => Array.isArray(r.json('quotes')),
  });
  sleep(0.5);
}
