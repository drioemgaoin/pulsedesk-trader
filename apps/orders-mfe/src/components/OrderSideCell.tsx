import { Typography } from '@pulsedesk/ui';
import type { OrderSide } from '../api/types';

export interface OrderSideCellProps {
  side: OrderSide;
}

/** BUY / SELL label with semantic trading colour. */
export function OrderSideCell({ side }: OrderSideCellProps) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        color: side === 'BUY' ? 'trading.uptick' : 'trading.downtick',
      }}
    >
      {side}
    </Typography>
  );
}
