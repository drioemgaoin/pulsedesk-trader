/**
 * Scenario: order submission
 *
 * Covers: POST /api/v1/orders — write path through gateway → order-service →
 * risk-service → Kafka. Non-idempotent; not retried by gateway. Validates
 * p95 latency and error rate under baseline and stress VU counts.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from '../config.js';
import { getToken, authHeaders } from './auth.js';

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
    order_submit_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5  },
        { duration: '20s', target: 5  },
        { duration: '5s',  target: 0  },
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'order_submit_baseline' },
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
      tags: { scenario: 'order_submit_stress' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:order_submit_baseline}': THRESHOLDS['http_req_duration{scenario:order_submit_baseline}'],
    'http_req_duration{scenario:order_submit_stress}':   THRESHOLDS['http_req_duration{scenario:order_submit_stress}'],
    'http_req_failed': THRESHOLDS['http_req_failed'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const res = http.post(
    `${BASE_URL}/api/v1/orders`,
    randomOrder(),
    authHeaders(data.token),
  );
  // Gateway proxies to order-service; 201 = accepted, 400 = validation fail,
  // 502/503 = downstream unavailable — all are non-crash responses.
  check(res, {
    'order-submit: not 500':        (r) => r.status !== 500,
    'order-submit: not unhandled':  (r) => r.status < 500 || r.status === 502 || r.status === 503,
  });
  sleep(1);
}
