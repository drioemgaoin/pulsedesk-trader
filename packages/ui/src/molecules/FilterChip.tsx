import { Chip, type ChipProps } from '../atoms';
import { ORDER_STATUS_COLORS, filterChipSx, partiallyFilledChipSx, cancelledChipSx } from '../tokens';
import type { OrderStatus } from '../tokens';

export interface FilterChipProps extends Omit<ChipProps, 'color' | 'variant' | 'label'> {
  status: OrderStatus;
  isActive: boolean;
}

export function FilterChip({ status, isActive, sx, onClick, ...props }: FilterChipProps) {
  return (
    <Chip
      label={status === 'PARTIALLY_FILLED' ? 'PARTIAL' : status}
      color={isActive ? ORDER_STATUS_COLORS[status] ?? 'default' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
      onClick={onClick}
      aria-pressed={isActive}
      sx={{
        ...filterChipSx(isActive),
        ...(status === 'PARTIALLY_FILLED' && partiallyFilledChipSx),
        ...(status === 'CANCELLED' && cancelledChipSx),
        ...sx,
      }}
      {...props}
    />
  );
}
