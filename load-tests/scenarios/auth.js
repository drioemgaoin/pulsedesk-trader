/**
 * Auth helper — returns a Bearer token for the demo user.
 * Called once per VU in setup() or initEnv().
 */
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, USERNAME, PASSWORD } from '../config.js';

export function getToken() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/token`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'auth: 200': (r) => r.status === 200 });
  return res.json('accessToken');
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}
