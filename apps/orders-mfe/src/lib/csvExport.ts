import { format } from 'date-fns';
import type { OrderResponseV1 } from '../api/types';

export function buildOrdersCsvContent(orders: OrderResponseV1[]): string {
  const header = 'Order ID,Symbol,Side,Type,Quantity,Status,Submitted,Fill Time,Fill Price';
  const rows = orders.map((o) => [
    o.orderId,
    o.symbol,
    o.side,
    o.type,
    o.quantity,
    o.status,
    format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    o.filledAt ? format(new Date(o.filledAt), 'yyyy-MM-dd HH:mm:ss') : '',
    o.fillPrice ?? '',
  ].join(','));
  return [header, ...rows].join('\n');
}

export function downloadOrdersCsv(orders: OrderResponseV1[]): void {
  const csv = buildOrdersCsvContent(orders);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orders.csv';
  a.click();
  URL.revokeObjectURL(url);
}
