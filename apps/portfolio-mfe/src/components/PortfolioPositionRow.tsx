import {
  TableCell,
  TableRow,
  Typography,
  tableRowSx,
} from '@pulsedesk/ui';
import { pctReturn } from '../lib/portfolioCalc';
import { Sparkline } from './Sparkline';
import type { PositionV1 } from '../api/types';

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPnl(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}`;
}

export interface PortfolioPositionRowProps {
  position: PositionV1;
  index: number;
  /** Resolves trading color for a P&L value — depends on current theme palette. */
  pnlColour: (val: number) => string;
  /** Price tick history used to render the sparkline trend. */
  tickHistory: number[];
}

/** Single row in the portfolio positions table. */
export function PortfolioPositionRow({
  position: p,
  index,
  pnlColour,
  tickHistory,
}: PortfolioPositionRowProps) {
  const ret = pctReturn(p);
  const marketValue = p.quantity * p.marketPrice;

  return (
    <TableRow key={p.symbol} sx={tableRowSx(index)}>
      <TableCell sx={{ fontWeight: 700 }}>{p.symbol}</TableCell>
      <TableCell
        align="right"
        sx={{ fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'table-cell' } }}
      >
        {p.quantity}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}
      >
        {fmt(p.averageCost)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontVariantNumeric: 'tabular-nums', display: { xs: 'none', md: 'table-cell' } }}
      >
        {fmt(p.marketPrice)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', display: { xs: 'none', lg: 'table-cell' } }}
      >
        ${fmt(marketValue)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ color: pnlColour(p.unrealizedPnl), fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
        aria-label={`${p.symbol} unrealized PnL`}
      >
        {fmtPnl(p.unrealizedPnl)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ color: pnlColour(ret), fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
        aria-label={`${p.symbol} return`}
      >
        {ret >= 0 ? '+' : ''}{fmt(ret)}%
      </TableCell>
      <TableCell align="center" sx={{ width: 136, px: 0.5, display: { xs: 'none', sm: 'table-cell' } }}>
        <div style={{ width: 120, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {tickHistory.length >= 2 ? (
            <Sparkline data={tickHistory} width={120} height={36} />
          ) : (
            <Typography variant="caption" color="text.disabled">—</Typography>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
