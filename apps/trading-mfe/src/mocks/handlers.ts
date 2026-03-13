import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

export const handlers = [
  http.get(`${BASE}/api/v1/watchlist`, () =>
    HttpResponse.json({
      quotes: [
        { symbol: 'AAPL', bid: 149.5, ask: 150.0, last: 149.75, volume: 5_000_000, timestamp: new Date().toISOString() },
        { symbol: 'TSLA', bid: 199.0, ask: 200.0, last: 199.5, volume: 3_000_000, timestamp: new Date().toISOString() },
        { symbol: 'MSFT', bid: 299.0, ask: 300.0, last: 299.5, volume: 2_000_000, timestamp: new Date().toISOString() },
        { symbol: 'NVDA', bid: 499.0, ask: 500.0, last: 499.5, volume: 4_000_000, timestamp: new Date().toISOString() },
        { symbol: 'AMZN', bid: 179.0, ask: 180.0, last: 179.5, volume: 1_500_000, timestamp: new Date().toISOString() },
      ],
      asOf: new Date().toISOString(),
    }),
  ),

  http.get(`${BASE}/api/v1/orders`, () =>
    HttpResponse.json({ orders: [], pagination: { limit: 50, offset: 0, total: 0 } }),
  ),

  http.post(`${BASE}/api/v1/orders`, () =>
    HttpResponse.json(
      {
        id: 'ord-001',
        commandId: 'cmd-001',
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
