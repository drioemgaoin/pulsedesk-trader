export const MOCK_ACCOUNT_ID = 'acc-demo-001';

/**
 * A valid JWT that decodes to { sub: 'acc-demo-001', username: 'demo', exp: 9999999999 }
 */
export const MOCK_TOKEN = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiJhY2MtZGVtby0wMDEiLCJ1c2VybmFtZSI6ImRlbW8iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0',
  'mock_signature',
].join('.');

// Fixed timestamps keep Storybook visuals deterministic across refreshes.
const now = '2026-03-16T10:00:00.000Z';
const fiveMinsAgo = '2026-03-16T09:55:00.000Z';
const tenMinsAgo = '2026-03-16T09:50:00.000Z';
const oneDayAgo = '2026-03-15T10:00:00.000Z';
const twoDaysAgo = '2026-03-14T10:00:00.000Z';

export const MOCK_AS_OF = now;

export const MOCK_ORDERS = [
  {
    id: 'ord-00000001-0001-0001-0001-000000000001',
    commandId: 'cmd-00000001-0001-0001-0001-000000000001',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'AAPL',
    side: 'BUY',
    type: 'MARKET',
    quantity: 100,
    limitPrice: null,
    rejectionReason: null,
    status: 'FILLED',
    createdAt: oneDayAgo,
    updatedAt: oneDayAgo,
  },
  {
    id: 'ord-00000002-0002-0002-0002-000000000002',
    commandId: 'cmd-00000002-0002-0002-0002-000000000002',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'TSLA',
    side: 'SELL',
    type: 'LIMIT',
    quantity: 50,
    limitPrice: 245.00,
    rejectionReason: null,
    status: 'PENDING',
    createdAt: fiveMinsAgo,
    updatedAt: fiveMinsAgo,
  },
  {
    id: 'ord-00000003-0003-0003-0003-000000000003',
    commandId: 'cmd-00000003-0003-0003-0003-000000000003',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'MSFT',
    side: 'BUY',
    type: 'MARKET',
    quantity: 20,
    limitPrice: null,
    rejectionReason: null,
    status: 'ACCEPTED',
    createdAt: tenMinsAgo,
    updatedAt: tenMinsAgo,
  },
  {
    id: 'ord-00000004-0004-0004-0004-000000000004',
    commandId: 'cmd-00000004-0004-0004-0004-000000000004',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'NVDA',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 10,
    limitPrice: 870.00,
    rejectionReason: null,
    status: 'PARTIALLY_FILLED',
    createdAt: twoDaysAgo,
    updatedAt: now,
  },
  {
    id: 'ord-00000005-0005-0005-0005-000000000005',
    commandId: 'cmd-00000005-0005-0005-0005-000000000005',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'AMZN',
    side: 'SELL',
    type: 'MARKET',
    quantity: 30,
    limitPrice: null,
    rejectionReason: 'Insufficient position to sell',
    status: 'REJECTED',
    createdAt: oneDayAgo,
    updatedAt: oneDayAgo,
  },
  {
    id: 'ord-00000006-0006-0006-0006-000000000006',
    commandId: 'cmd-00000006-0006-0006-0006-000000000006',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'AAPL',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 200,
    limitPrice: 170.00,
    rejectionReason: null,
    status: 'CANCELLED',
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
  {
    id: 'ord-00000007-0007-0007-0007-000000000007',
    commandId: 'cmd-00000007-0007-0007-0007-000000000007',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'TSLA',
    side: 'BUY',
    type: 'MARKET',
    quantity: 75,
    limitPrice: null,
    rejectionReason: null,
    status: 'FILLED',
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
  {
    id: 'ord-00000008-0008-0008-0008-000000000008',
    commandId: 'cmd-00000008-0008-0008-0008-000000000008',
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'MSFT',
    side: 'SELL',
    type: 'LIMIT',
    quantity: 40,
    limitPrice: 420.00,
    rejectionReason: null,
    status: 'PENDING',
    createdAt: fiveMinsAgo,
    updatedAt: fiveMinsAgo,
  },
];

export const MOCK_POSITIONS = [
  {
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'AAPL',
    quantity: 100,
    averageCost: 162.50,
    marketPrice: 178.32,
    unrealizedPnl: 1582.00,
    updatedAt: now,
  },
  {
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'TSLA',
    quantity: 75,
    averageCost: 225.00,
    marketPrice: 242.30,
    unrealizedPnl: 1297.50,
    updatedAt: now,
  },
  {
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'MSFT',
    quantity: 20,
    averageCost: 390.00,
    marketPrice: 415.82,
    unrealizedPnl: 516.40,
    updatedAt: now,
  },
  {
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'NVDA',
    quantity: 10,
    averageCost: 920.00,
    marketPrice: 875.65,
    unrealizedPnl: -443.50,
    updatedAt: now,
  },
  {
    accountId: MOCK_ACCOUNT_ID,
    symbol: 'AMZN',
    quantity: 50,
    averageCost: 195.00,
    marketPrice: 187.45,
    unrealizedPnl: -377.50,
    updatedAt: now,
  },
];

export const MOCK_WATCHLIST_QUOTES = [
  { symbol: 'AAPL', bid: 178.20, ask: 178.45, last: 178.32, volume: 52_341_200, timestamp: now },
  { symbol: 'TSLA', bid: 242.10, ask: 242.55, last: 242.30, volume: 31_882_400, timestamp: now },
  { symbol: 'MSFT', bid: 415.70, ask: 415.95, last: 415.82, volume: 18_440_100, timestamp: now },
  { symbol: 'NVDA', bid: 875.40, ask: 875.90, last: 875.65, volume: 44_215_300, timestamp: now },
  { symbol: 'AMZN', bid: 187.30, ask: 187.60, last: 187.45, volume: 27_663_800, timestamp: now },
];
