import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

export const handlers = [
  http.get(`${BASE}/api/v1/watchlist`, () =>
    HttpResponse.json({ symbols: ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN'] }),
  ),

  http.get(`${BASE}/api/v1/orders`, () =>
    HttpResponse.json({ orders: [], pagination: { limit: 50, offset: 0, total: 0 } }),
  ),

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
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 },
    ),
  ),

  http.get(`${BASE}/api/v1/positions`, () =>
    HttpResponse.json({
      accountId: 'acc-001',
      positions: [],
      totalUnrealizedPnl: 0,
      asOf: new Date().toISOString(),
    }),
  ),
];
