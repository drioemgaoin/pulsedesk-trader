/** Client → Server: subscribe to a set of symbols */
export interface SubscribeMessageV1 {
  event: 'subscribe';
  data: { symbols: string[] };
}

/** Client → Server: unsubscribe from a set of symbols */
export interface UnsubscribeMessageV1 {
  event: 'unsubscribe';
  data: { symbols: string[] };
}

/** Server → Client: current subscription state after a subscribe/unsubscribe */
export interface SubscribedAckV1 {
  event: 'subscribed';
  data: { symbols: string[] };
}

/** Server → Client: order fill notification (sent only to the owning accountId) */
export interface OrderFilledNotificationV1 {
  event: 'order.filled';
  data: {
    orderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    filledQuantity: number;
    fillPrice: number;
    accountId: string;
  };
}
