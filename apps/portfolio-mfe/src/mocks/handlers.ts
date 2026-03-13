import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

export const handlers = [
  http.get(`${BASE}/api/v1/positions`, () =>
    HttpResponse.json({
      accountId: 'acc-001',
      positions: [],
      totalUnrealizedPnl: 0,
      asOf: new Date().toISOString(),
    }),
  ),
];
