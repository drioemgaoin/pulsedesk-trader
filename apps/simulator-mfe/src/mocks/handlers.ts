import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

export const handlers = [
  http.post(`${BASE}/api/v1/orders`, () =>
    HttpResponse.json(
      {
        orderId: 'ord-001',
        idempotencyKey: 'key-001',
        accountId: 'acc-001',
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10,
        status: 'ACCEPTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 },
    ),
  ),
];
