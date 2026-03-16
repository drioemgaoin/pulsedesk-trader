import { Chip, type ChipProps } from '../atoms';
import { ORDER_STATUS_COLORS, statusChipSx, partiallyFilledChipSx, cancelledChipSx } from '../tokens';
import type { OrderStatus } from '../tokens';

export interface StatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  status: OrderStatus;
}

export function StatusChip({ status, sx, ...props }: StatusChipProps) {
  return (
    <Chip
      label={status === 'PARTIALLY_FILLED' ? 'PARTIAL' : status}
      color={ORDER_STATUS_COLORS[status]}
      size="small"
      sx={{
        ...statusChipSx,
        ...(status === 'PARTIALLY_FILLED' && partiallyFilledChipSx),
        ...(status === 'CANCELLED' && cancelledChipSx),
        ...sx,
      }}
      {...props}
    />
  );
}
