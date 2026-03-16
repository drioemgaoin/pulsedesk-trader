import { http, HttpResponse } from 'msw';
import {
  MOCK_ORDERS,
  MOCK_POSITIONS,
  MOCK_WATCHLIST_QUOTES,
  MOCK_ACCOUNT_ID,
  MOCK_TOKEN,
  MOCK_AS_OF,
} from './data';

const API_V1 = '*/api/v1';

function parseIntParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getFilteredOrders(urlString: string) {
  const url = new URL(urlString);
  const params = url.searchParams;

  const status = params.get('status');
  const symbol = params.get('symbol');
  const side = params.get('side');
  const from = params.get('from');
  const to = params.get('to');
  const limit = parseIntParam(params.get('limit'), 25);
  const offset = parseIntParam(params.get('offset'), 0);

  let orders = [...MOCK_ORDERS];

  if (status) orders = orders.filter((o) => o.status === status);
  if (symbol) orders = orders.filter((o) => o.symbol === symbol);
  if (side) orders = orders.filter((o) => o.side === side);

  if (from) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    orders = orders.filter((o) => new Date(o.createdAt) >= fromDate);
  }
  if (to) {
    const toDate = new Date(`${to}T23:59:59.999Z`);
    orders = orders.filter((o) => new Date(o.createdAt) <= toDate);
  }

  // Keep newest first for deterministic, tab-friendly display.
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const paged = orders.slice(offset, offset + limit);

  return {
    orders: paged,
    pagination: { limit, offset, total: orders.length },
  };
}

export const defaultHandlers = [
  // Auth
  http.post(`${API_V1}/auth/token`, () =>
    HttpResponse.json({ accessToken: MOCK_TOKEN }),
  ),

  // Watchlist — used by trading-mfe WatchlistPanel and useWatchlistQuery
  http.get(`${API_V1}/watchlist`, () =>
    HttpResponse.json({
      quotes: MOCK_WATCHLIST_QUOTES,
      asOf: MOCK_AS_OF,
    }),
  ),

  // Orders — used by trading-mfe BlotterPanel and orders-mfe OrdersPage
  // Response shape: { orders: [...], pagination: { limit, offset, total } }
  // Supports query filters used by trading-mfe/orders-mfe:
  // ?status=...&symbol=...&side=...&from=YYYY-MM-DD&to=YYYY-MM-DD&limit&offset
  http.get(`${API_V1}/orders`, ({ request }) =>
    HttpResponse.json(getFilteredOrders(request.url)),
  ),

  // Submit order
  http.post(`${API_V1}/orders`, () =>
    HttpResponse.json(
      {
        id: 'ord-new-00000001',
        commandId: 'cmd-new-00000001',
        accountId: MOCK_ACCOUNT_ID,
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10,
        limitPrice: null,
        rejectionReason: null,
        status: 'PENDING',
        createdAt: MOCK_AS_OF,
        updatedAt: MOCK_AS_OF,
      },
      { status: 201 },
    ),
  ),

  // Cancel order — orders-mfe calls POST /api/v1/orders/:orderId/cancel
  http.post(`${API_V1}/orders/:orderId/cancel`, () =>
    HttpResponse.json({ success: true }),
  ),

  // Positions — used by trading-mfe PositionsPanel and portfolio-mfe PortfolioPage
  // Response shape: { accountId, positions: [...], totalUnrealizedPnl, asOf }
  http.get(`${API_V1}/positions`, () =>
    HttpResponse.json({
      accountId: MOCK_ACCOUNT_ID,
      positions: MOCK_POSITIONS,
      totalUnrealizedPnl: MOCK_POSITIONS.reduce((sum, p) => sum + p.unrealizedPnl, 0),
      asOf: MOCK_AS_OF,
    }),
  ),

  // Simulator endpoints
  http.post(`${API_V1}/simulator/start`, () =>
    HttpResponse.json({ status: 'started' }),
  ),
  http.post(`${API_V1}/simulator/stop`, () =>
    HttpResponse.json({ status: 'stopped' }),
  ),
];

export const emptyOrderHandlers = [
  http.post(`${API_V1}/auth/token`, () =>
    HttpResponse.json({ accessToken: MOCK_TOKEN }),
  ),

  http.get(`${API_V1}/watchlist`, () =>
    HttpResponse.json({
      quotes: MOCK_WATCHLIST_QUOTES,
      asOf: MOCK_AS_OF,
    }),
  ),

  http.get(`${API_V1}/orders`, () =>
    HttpResponse.json({
      orders: [],
      pagination: { limit: 25, offset: 0, total: 0 },
    }),
  ),

  http.post(`${API_V1}/orders`, () =>
    HttpResponse.json(
      {
        id: 'ord-new-00000001',
        commandId: 'cmd-new-00000001',
        accountId: MOCK_ACCOUNT_ID,
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10,
        limitPrice: null,
        rejectionReason: null,
        status: 'PENDING',
        createdAt: MOCK_AS_OF,
        updatedAt: MOCK_AS_OF,
      },
      { status: 201 },
    ),
  ),

  http.get(`${API_V1}/positions`, () =>
    HttpResponse.json({
      accountId: MOCK_ACCOUNT_ID,
      positions: [],
      totalUnrealizedPnl: 0,
      asOf: MOCK_AS_OF,
    }),
  ),
];
