import { format } from 'date-fns';
import type { OrderResponseV1 } from '../api/types';

export function buildOrdersCsvContent(orders: OrderResponseV1[]): string {
  const header = 'Order ID,Symbol,Side,Type,Quantity,Status,Submitted,Fill Time';
  const rows = orders.map((o) => [
    o.id,
    o.symbol,
    o.side,
    o.type,
    o.quantity,
    o.status,
    format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    (o.status === 'FILLED' || o.status === 'PARTIALLY_FILLED')
      ? format(new Date(o.updatedAt), 'yyyy-MM-dd HH:mm:ss')
      : '',
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
