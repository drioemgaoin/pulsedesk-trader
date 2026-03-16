import { http, HttpResponse } from 'msw';
import { MOCK_ORDERS, MOCK_POSITIONS, MOCK_WATCHLIST_QUOTES, MOCK_ACCOUNT_ID, MOCK_TOKEN } from './data';

const BASE = 'http://localhost:3000';

export const defaultHandlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.post(`${BASE}/api/v1/auth/token`, () =>
    HttpResponse.json({
      accessToken: MOCK_TOKEN,
      token: MOCK_TOKEN,
      username: 'demo',
      accountId: MOCK_ACCOUNT_ID,
    })
  ),

  // ── Watchlist ─────────────────────────────────────────────────────────────
  // useWatchlistQuery expects { quotes: MarketQuoteV1[]; asOf: string }
  http.get(`${BASE}/api/v1/watchlist`, () =>
    HttpResponse.json({
      quotes: MOCK_WATCHLIST_QUOTES,
      asOf: new Date().toISOString(),
    })
  ),

  // ── Orders ────────────────────────────────────────────────────────────────
  // useOrdersQuery (orders-mfe) uses: accountId, limit, offset, status?, symbol?, side?, from?, to?
  // useOrdersQuery (trading-mfe) uses: accountId, limit, offset, status?
  // Both expect { orders: OrderResponseV1[]; pagination: { limit, offset, total } }
  http.get(`${BASE}/api/v1/orders`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const symbol = url.searchParams.get('symbol');
    const side   = url.searchParams.get('side');
    const limit  = parseInt(url.searchParams.get('limit')  ?? '25', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0',  10);

    let filtered = MOCK_ORDERS;
    if (status) filtered = filtered.filter((o) => o.status === status);
    if (symbol) filtered = filtered.filter((o) => o.symbol === symbol);
    if (side)   filtered = filtered.filter((o) => o.side   === side);

    const page = filtered.slice(offset, offset + limit);
    return HttpResponse.json({
      orders: page,
      pagination: { limit, offset, total: filtered.length },
    });
  }),

  // Submit order
  http.post(`${BASE}/api/v1/orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: `ord-${Date.now()}`,
        commandId: body['idempotencyKey'] ?? `cmd-${Date.now()}`,
        accountId: body['accountId'] ?? MOCK_ACCOUNT_ID,
        symbol: body['symbol'] ?? 'AAPL',
        side: body['side'] ?? 'BUY',
        type: body['type'] ?? 'MARKET',
        quantity: body['quantity'] ?? 1,
        limitPrice: body['limitPrice'] ?? null,
        status: 'ACCEPTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // Cancel order
  http.post(`${BASE}/api/v1/orders/:orderId/cancel`, ({ params }) => {
    const order = MOCK_ORDERS.find((o) => o.id === params['orderId']);
    return HttpResponse.json({
      id: params['orderId'],
      commandId: `cmd-cancel-${params['orderId'] as string}`,
      accountId: MOCK_ACCOUNT_ID,
      symbol: order?.symbol ?? 'AAPL',
      side: order?.side ?? 'BUY',
      type: order?.type ?? 'MARKET',
      quantity: order?.quantity ?? 0,
      limitPrice: order?.limitPrice ?? null,
      status: 'CANCELLED',
      createdAt: order?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // ── Positions ─────────────────────────────────────────────────────────────
  // Both portfolio-mfe and trading-mfe expect:
  // { accountId, positions: PositionV1[], totalUnrealizedPnl, asOf }
  http.get(`${BASE}/api/v1/positions`, () =>
    HttpResponse.json({
      accountId: MOCK_ACCOUNT_ID,
      positions: MOCK_POSITIONS,
      totalUnrealizedPnl: MOCK_POSITIONS.reduce((sum, p) => sum + p.unrealizedPnl, 0),
      asOf: new Date().toISOString(),
    })
  ),
];

// ── Empty-state variant handlers ──────────────────────────────────────────────
// Use in individual stories that need to show empty-state UI.
// In MSW, later handlers in the same array override earlier ones for the same route.
// Compose as: parameters: { msw: { handlers: [...defaultHandlers, ...emptyOrderHandlers] } }
export const emptyOrderHandlers = [
  http.get(`${BASE}/api/v1/orders`, () =>
    HttpResponse.json({
      orders: [],
      pagination: { limit: 25, offset: 0, total: 0 },
    })
  ),
  http.get(`${BASE}/api/v1/positions`, () =>
    HttpResponse.json({
      accountId: MOCK_ACCOUNT_ID,
      positions: [],
      totalUnrealizedPnl: 0,
      asOf: new Date().toISOString(),
    })
  ),
];
