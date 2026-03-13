import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

export const handlers = [
  http.get(`${BASE}/api/v1/orders`, () =>
    HttpResponse.json({ orders: [], pagination: { limit: 25, offset: 0, total: 0 } }),
  ),

  http.post(`${BASE}/api/v1/orders/:orderId/cancel`, ({ params }) =>
    HttpResponse.json({
      orderId: params['orderId'],
      idempotencyKey: 'key-001',
      accountId: 'acc-001',
      symbol: 'AAPL',
      side: 'BUY',
      type: 'MARKET',
      quantity: 10,
      status: 'CANCELLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ),
];
