import { Box } from '@pulsedesk/ui';
import { CancelButton } from './CancelButton';

export interface OrderCancelCellProps {
  orderId: string;
  symbol: string;
  quantity: number;
  /** Only PENDING and ACCEPTED orders can be cancelled — renders null otherwise. */
  status: string;
}

/**
 * Table cell wrapper for the cancel action.
 * Stops row-expand click from propagating when the button is clicked.
 */
export function OrderCancelCell({ orderId, symbol, quantity, status }: OrderCancelCellProps) {
  if (status !== 'PENDING' && status !== 'ACCEPTED') return null;
  return (
    <Box onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      <CancelButton orderId={orderId} symbol={symbol} quantity={quantity} />
    </Box>
  );
}
