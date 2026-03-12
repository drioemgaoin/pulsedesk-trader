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
  Typography,
} from '@mui/material';
import { usePositionsQuery } from '../hooks/usePositionsQuery';

function formatDecimal(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PositionsPanelProps {
  accountId: string;
}

export function PositionsPanel({ accountId }: PositionsPanelProps) {
  const { data, isLoading, isError } = usePositionsQuery(accountId);

  const positions = data?.positions ?? null;
  const totalPnl = data?.totalUnrealizedPnl ?? null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Positions
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isError && (
          <Alert severity="error" sx={{ m: 1 }}>
            Failed to load positions. Retrying…
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Avg Cost</TableCell>
              <TableCell align="right">Mkt Price</TableCell>
              <TableCell align="right">Unrealized PnL</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && positions === null &&
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <TableCell key={j}>
                      <Skeleton height={14} width={`${45 + ((i * j * 11) % 35)}%`} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {positions !== null && positions.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.disabled', py: 3 }}>
                  No positions. Filled orders will appear here.
                </TableCell>
              </TableRow>
            )}
            {positions !== null &&
              positions.map((pos) => (
                <TableRow key={pos.symbol} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{pos.symbol}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{pos.quantity}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatDecimal(pos.averageCost)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatDecimal(pos.marketPrice)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                      color: pos.unrealizedPnl > 0 ? 'trading.uptick' : pos.unrealizedPnl < 0 ? 'trading.downtick' : 'text.secondary',
                    }}
                    aria-label={`Unrealized P&L: ${pos.unrealizedPnl >= 0 ? '+' : ''}${formatDecimal(pos.unrealizedPnl)}`}
                  >
                    {pos.unrealizedPnl >= 0 ? '+' : ''}{formatDecimal(pos.unrealizedPnl)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
          {totalPnl !== null && positions !== null && positions.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} align="right" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                  Total Unrealized PnL
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: totalPnl > 0 ? 'trading.uptick' : totalPnl < 0 ? 'trading.downtick' : 'text.secondary',
                  }}
                  aria-label={`Total Unrealized P&L: ${totalPnl >= 0 ? '+' : ''}${formatDecimal(totalPnl)}`}
                >
                  {totalPnl >= 0 ? '+' : ''}{formatDecimal(totalPnl)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Box>
    </Box>
  );
}
