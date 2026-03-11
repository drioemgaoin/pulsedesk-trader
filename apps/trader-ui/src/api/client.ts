export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FILLED'
  | 'PARTIALLY_FILLED'
  | 'CANCELLED';

export interface OrderResponseV1 {
  orderId: string;
  idempotencyKey: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PositionV1 {
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  marketPrice: number;
  unrealizedPnl: number;
  updatedAt: string;
}

export interface PositionsResponseV1 {
  accountId: string;
  positions: PositionV1[];
  totalUnrealizedPnl: number;
  asOf: string;
}

export interface SubmitOrderRequestV1 {
  idempotencyKey: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface GetOrdersQuery {
  accountId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface OrdersPageV1 {
  orders: OrderResponseV1[];
  pagination: { limit: number; offset: number; total: number };
}

export interface ApiClient {
  submitOrder(req: SubmitOrderRequestV1): Promise<OrderResponseV1>;
  getOrders(query: GetOrdersQuery): Promise<OrdersPageV1>;
  getPositions(accountId: string): Promise<PositionsResponseV1>;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body['message'] === 'string') message = body['message'];
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

// Map order-service DTO fields to our V1 interface
function normaliseOrder(raw: Record<string, unknown>): OrderResponseV1 {
  return {
    orderId: (raw['id'] as string | undefined) ?? (raw['orderId'] as string),
    idempotencyKey:
      (raw['commandId'] as string | undefined) ??
      (raw['idempotencyKey'] as string),
    accountId: raw['accountId'] as string,
    symbol: raw['symbol'] as string,
    side: raw['side'] as OrderSide,
    type: raw['type'] as OrderType,
    quantity: raw['quantity'] as number,
    limitPrice:
      raw['limitPrice'] != null ? (raw['limitPrice'] as number) : undefined,
    status: raw['status'] as OrderStatus,
    createdAt: raw['createdAt'] as string,
    updatedAt: raw['updatedAt'] as string,
  };
}

export function createApiClient(baseUrl: string, token: string): ApiClient {
  const headers = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  return {
    async submitOrder(req: SubmitOrderRequestV1): Promise<OrderResponseV1> {
      const body = {
        commandId: req.idempotencyKey,
        accountId: req.accountId,
        symbol: req.symbol,
        side: req.side,
        type: req.type,
        quantity: req.quantity,
        limitPrice: req.limitPrice,
      };
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      });
      const raw = await parseResponse<Record<string, unknown>>(res);
      return normaliseOrder(raw);
    },

    async getOrders({ accountId, status, limit = 50, offset = 0 }: GetOrdersQuery): Promise<OrdersPageV1> {
      const params = new URLSearchParams({ accountId, limit: String(limit), offset: String(offset) });
      if (status) params.set('status', status);
      const res = await fetch(`${baseUrl}/api/v1/orders?${params.toString()}`, { headers: headers() });
      const raw = await parseResponse<{ orders: Record<string, unknown>[]; pagination: { limit: number; offset: number; total: number } }>(res);
      return {
        orders: raw.orders.map(normaliseOrder),
        pagination: raw.pagination,
      };
    },

    async getPositions(accountId: string): Promise<PositionsResponseV1> {
      const res = await fetch(
        `${baseUrl}/api/v1/positions?accountId=${encodeURIComponent(accountId)}`,
        { headers: headers() },
      );
      return parseResponse<PositionsResponseV1>(res);
    },
  };
}
