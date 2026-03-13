/**
 * Shared mock data used across E2E tests.
 * All shapes mirror the real backend DTOs confirmed in M9.
 */

// Build a minimal but valid JWT:  header.payload.signature
// payload must contain { sub: accountId } — authSlice.decodeAccountId reads `sub`
export const TEST_ACCOUNT_ID = 'acc-test-001';
export const TEST_USERNAME = 'trader';
const jwtPayload = Buffer.from(JSON.stringify({ sub: TEST_ACCOUNT_ID })).toString('base64');
export const TEST_JWT = `eyJhbGciOiJIUzI1NiJ9.${jwtPayload}.fakesig`;

export const LOGIN_RESPONSE = { accessToken: TEST_JWT };

export const WATCHLIST_RESPONSE = {
  quotes: [
    { symbol: 'AAPL', bid: 149.50, ask: 150.00, last: 149.75, volume: 5_000_000, timestamp: new Date().toISOString() },
    { symbol: 'TSLA', bid: 199.00, ask: 200.00, last: 199.50, volume: 3_000_000, timestamp: new Date().toISOString() },
    { symbol: 'MSFT', bid: 299.00, ask: 300.00, last: 299.50, volume: 2_000_000, timestamp: new Date().toISOString() },
    { symbol: 'NVDA', bid: 499.00, ask: 500.00, last: 499.50, volume: 4_000_000, timestamp: new Date().toISOString() },
    { symbol: 'AMZN', bid: 179.00, ask: 180.00, last: 179.50, volume: 1_500_000, timestamp: new Date().toISOString() },
  ],
  asOf: new Date().toISOString(),
};

export const ORDER_PENDING = {
  id: 'ord-e2e-001',
  commandId: 'cmd-e2e-001',
  accountId: TEST_ACCOUNT_ID,
  symbol: 'AAPL',
  side: 'BUY',
  type: 'MARKET',
  quantity: 10,
  limitPrice: null,
  status: 'PENDING',
  rejectionReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const ORDER_ACCEPTED = { ...ORDER_PENDING, status: 'ACCEPTED' };
export const ORDER_FILLED  = { ...ORDER_PENDING, status: 'FILLED', updatedAt: new Date().toISOString() };
export const ORDER_REJECTED = {
  ...ORDER_PENDING,
  id: 'ord-e2e-002',
  status: 'REJECTED',
  rejectionReason: 'Risk limit exceeded',
};

export const ORDERS_EMPTY_PAGE = {
  orders: [],
  pagination: { limit: 25, offset: 0, total: 0 },
};

export const ORDERS_ONE_FILLED = {
  orders: [ORDER_FILLED],
  pagination: { limit: 25, offset: 0, total: 1 },
};

export const ORDERS_MIXED = {
  orders: [ORDER_FILLED, ORDER_REJECTED, ORDER_PENDING],
  pagination: { limit: 25, offset: 0, total: 3 },
};

export const POSITIONS_EMPTY = {
  accountId: TEST_ACCOUNT_ID,
  positions: [],
  totalUnrealizedPnl: 0,
  asOf: new Date().toISOString(),
};

export const POSITIONS_WITH_AAPL = {
  accountId: TEST_ACCOUNT_ID,
  positions: [
    {
      accountId: TEST_ACCOUNT_ID,
      symbol: 'AAPL',
      quantity: 10,
      averageCost: 149.75,
      marketPrice: 152.00,
      unrealizedPnl: 22.50,
      updatedAt: new Date().toISOString(),
    },
  ],
  totalUnrealizedPnl: 22.50,
  asOf: new Date().toISOString(),
};

// WS fill event — matches the backend `order.filled` WS protocol
export const WS_FILL_EVENT = {
  event: 'order.filled',
  data: {
    orderId: ORDER_PENDING.id,
    symbol: 'AAPL',
    side: 'BUY',
    filledQuantity: 10,
    fillPrice: 149.75,
    accountId: TEST_ACCOUNT_ID,
  },
};

// WS market tick events — use eventType:'market.tick' to match useMarketStream.isMarketTick()
export const WS_TICK_AAPL = {
  eventType: 'market.tick',
  symbol: 'AAPL', bid: 149.50, ask: 150.00, last: 149.75, volume: 5_000_001, timestamp: new Date().toISOString(),
};

// All 5 watchlist symbols as WS ticks — sent by the default WS mock in setupDefaultMocks
export const WS_MARKET_TICKS = WATCHLIST_RESPONSE.quotes.map((q) => ({
  eventType: 'market.tick',
  symbol: q.symbol,
  bid: q.bid,
  ask: q.ask,
  last: q.last,
  volume: q.volume,
  timestamp: q.timestamp,
}));
