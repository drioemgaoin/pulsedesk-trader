/**
 * Scenario: order query
 *
 * Covers: GET /api/v1/orders?accountId=<id> — read path through gateway →
 * order-service. Validates p95 latency under baseline and stress VU counts.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ACCOUNT_ID, THRESHOLDS } from '../config.js';
import { getToken, authHeaders } from './auth.js';

export const options = {
  scenarios: {
    order_query_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'order_query_baseline' },
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
      tags: { scenario: 'order_query_stress' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:order_query_baseline}': THRESHOLDS['http_req_duration{scenario:order_query_baseline}'],
    'http_req_duration{scenario:order_query_stress}':   THRESHOLDS['http_req_duration{scenario:order_query_stress}'],
    'http_req_failed': THRESHOLDS['http_req_failed'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const res = http.get(
    `${BASE_URL}/api/v1/orders?accountId=${ACCOUNT_ID}`,
    authHeaders(data.token),
  );
  check(res, {
    'order-query: status 200 or 502': (r) => r.status === 200 || r.status === 502,
    'order-query: not 500':           (r) => r.status !== 500,
  });
  sleep(0.5);
}
