import {
  Alert,
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { usePositionsQuery } from '../hooks/usePositionsQuery';

function fmt2(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctReturn(unrealizedPnl: number, quantity: number, averageCost: number): number | null {
  const cost = quantity * averageCost;
  if (cost === 0) return null;
  return (unrealizedPnl / cost) * 100;
}

const headerSx = {
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase' as const,
  color: 'text.disabled',
  py: 1,
};

interface PositionsPanelProps {
  accountId: string;
}

export function PositionsPanel({ accountId }: PositionsPanelProps) {
  const { data, isLoading, isError } = usePositionsQuery(accountId);

  const positions = data?.positions ?? null;
  const totalPnl = data?.totalUnrealizedPnl ?? null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isError && (
          <Alert severity="error" sx={{ m: 1 }}>Failed to load positions. Retrying…</Alert>
        )}

        <Table
          size="small"
          sx={{
            '& .MuiTableBody-root .MuiTableCell-root': {
              height: 44,
              py: 0,
              verticalAlign: 'middle',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={headerSx}>Symbol</TableCell>
              <TableCell align="right" sx={{ ...headerSx, display: { xs: 'none', sm: 'table-cell' } }}>
                <Tooltip title="Number of shares currently held" placement="top">
                  <span>Qty</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ ...headerSx, display: { xs: 'none', md: 'table-cell' } }}>
                <Tooltip title="Average price paid per share across all purchases" placement="top">
                  <span>Avg Cost</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ ...headerSx, display: { xs: 'none', md: 'table-cell' } }}>
                <Tooltip title="Current market price per share" placement="top">
                  <span>Mkt Price</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={headerSx}>
                <Tooltip title="Unrealized profit or loss — what you would gain or lose if you sold this position right now" placement="top">
                  <span>Unreal. P&amp;L</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={headerSx}>
                <Tooltip title="Percentage gain or loss relative to your average purchase price" placement="top">
                  <span>Return</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && positions === null &&
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}>
                      <Skeleton height={14} width={`${45 + ((i * j * 11) % 35)}%`} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {positions !== null && positions.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.disabled' }}>
                  No open positions. Executed orders will appear here.
                </TableCell>
              </TableRow>
            )}
            {positions !== null &&
              positions.map((pos) => {
                const ret = pctReturn(pos.unrealizedPnl, pos.quantity, pos.averageCost);
                const pnlColor = pos.unrealizedPnl > 0 ? 'trading.uptick' : pos.unrealizedPnl < 0 ? 'trading.downtick' : 'text.secondary';
                const retColor = ret !== null ? (ret > 0 ? 'trading.uptick' : ret < 0 ? 'trading.downtick' : 'text.secondary') : 'text.secondary';
                return (
                  <TableRow key={pos.symbol} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{pos.symbol}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'table-cell' } }}>{pos.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>{fmt2(pos.averageCost)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', display: { xs: 'none', md: 'table-cell' } }}>{fmt2(pos.marketPrice)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: pnlColor }}
                      aria-label={`Unrealized P&L: ${pos.unrealizedPnl >= 0 ? '+' : ''}${fmt2(pos.unrealizedPnl)}`}
                    >
                      {pos.unrealizedPnl >= 0 ? '+' : ''}{fmt2(pos.unrealizedPnl)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontVariantNumeric: 'tabular-nums', color: retColor }}
                    >
                      {ret !== null ? `${ret >= 0 ? '+' : ''}${fmt2(ret)}%` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
          {totalPnl !== null && positions !== null && positions.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} align="right" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                  <Tooltip title="Combined unrealized profit or loss across all open positions — what you would gain or lose if you closed everything now" placement="top">
                    <span>Total Unrealized P&amp;L</span>
                  </Tooltip>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: totalPnl > 0 ? 'trading.uptick' : totalPnl < 0 ? 'trading.downtick' : 'text.secondary',
                  }}
                  aria-label={`Total Unrealized P&L: ${totalPnl >= 0 ? '+' : ''}${fmt2(totalPnl)}`}
                >
                  {totalPnl >= 0 ? '+' : ''}{fmt2(totalPnl)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Box>
    </Box>
  );
}
