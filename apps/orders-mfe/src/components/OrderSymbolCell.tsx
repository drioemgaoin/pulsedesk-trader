import { Typography } from '@pulsedesk/ui';

export interface OrderSymbolCellProps {
  symbol: string;
}

/** Bold ticker symbol display in the orders table. */
export function OrderSymbolCell({ symbol }: OrderSymbolCellProps) {
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {symbol}
    </Typography>
  );
}
