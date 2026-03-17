import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import type { SxProps } from '@mui/material';

export interface StatCellProps {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  sx?: SxProps;
}

/**
 * Market-data stat cell — compact label above value layout.
 *
 * Used in ticker strips, position cards, and anywhere a market metric
 * (Bid, Ask, Spread, Volume, P&L, etc.) needs to be displayed.
 *
 * @example
 *   <StatCell label="Bid" value="182.34" tooltip="Highest buyer price" />
 *   <StatCell label="Volume" value="1.2M" />
 */
export function StatCell({
  label,
  value,
  tooltip,
  tooltipPlacement = 'bottom',
  sx,
}: StatCellProps) {
  const content = (
    <Box sx={{ cursor: tooltip ? 'default' : 'auto', ...sx }}>
      <Typography
        display="block"
        lineHeight={1}
        sx={{
          fontSize:      '0.625rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color:         'text.disabled',
          mb:            0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, lineHeight: 1 }}
      >
        {value}
      </Typography>
    </Box>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement={tooltipPlacement}>
      {content}
    </Tooltip>
  ) : content;
}
