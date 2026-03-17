import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SxProps } from '@mui/material';

export interface PnlValueProps {
  /** Unrealized / realized P&L in USD. */
  value: number;
  /** Show percentage return alongside. */
  pct?: number;
  /** Typography variant for the main P&L figure. Defaults to 'body2'. */
  variant?: 'caption' | 'body2' | 'body1' | 'subtitle2' | 'subtitle1' | 'h6' | 'h5' | 'h4';
  /** Extra sx on the wrapper span. */
  sx?: SxProps;
}

/**
 * Colored P&L display — green for positive, red for negative.
 * Renders as inline so it composes naturally inside table cells, headers, etc.
 *
 * @example
 *   <PnlValue value={1234.56} pct={2.3} />       // +$1,234.56 (+2.30%)
 *   <PnlValue value={-500}    pct={-1.1} />       // -$500.00 (-1.10%)
 */
export function PnlValue({ value, pct, variant = 'body2', sx }: PnlValueProps) {
  const positive = value >= 0;
  const color    = positive ? 'trading.uptick' : 'trading.downtick';
  const prefix   = positive ? '+' : '';

  const formatted = value.toLocaleString('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.75, ...sx }}>
      <Typography
        component="span"
        variant={variant}
        sx={{
          color,
          fontVariantNumeric: 'tabular-nums',
          fontWeight:         600,
          lineHeight:         'inherit',
        }}
      >
        {prefix}{formatted}
      </Typography>

      {pct !== undefined && (
        <Typography
          component="span"
          sx={{
            color,
            fontSize:           '0.75rem',
            fontVariantNumeric: 'tabular-nums',
            lineHeight:         'inherit',
          }}
        >
          ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
        </Typography>
      )}
    </Box>
  );
}
