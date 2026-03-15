import { Box, Card, CardContent, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import { acceptanceRate, avgFillLatency, fillRate, rejectionRate } from '../lib/stats';
import type { SimulatorStats } from '../lib/stats';

interface LiveStatsProps {
  stats: SimulatorStats;
  elapsedMs: number;
  fired: number;
  total: number | null;
}

function StatBox({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        flex: 1,
        textAlign: 'center',
        minWidth: 72,
        borderColor: accent ? `${accent}40` : 'divider',
      }}
    >
      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ color: accent, fontVariantNumeric: 'tabular-nums' }}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
    </Paper>
  );
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight={600} sx={{ color, fontVariantNumeric: 'tabular-nums' }}>
          {pct}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
        aria-label={`${label} ${pct}%`}
      />
    </Box>
  );
}

export function LiveStats({ stats, elapsedMs, fired, total }: LiveStatsProps) {
  const theme = useTheme();
  const latency = avgFillLatency(stats);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  // Use theme-aware status colors
  const colorUp      = theme.palette.success.main;
  const colorInfo    = theme.palette.info.main;
  const colorDown    = theme.palette.error.main;
  const colorPending = theme.palette.warning.main;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Live Stats</Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums' }}
            aria-label="elapsed time"
          >
            {elapsedSec}s{total ? ` · ${fired}/${total}` : ` · ${fired} fired`}
          </Typography>
        </Stack>

        {/* Counters */}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
          <StatBox label="Submitted" value={stats.submitted} />
          <StatBox label="Accepted"  value={stats.accepted}  accent={colorInfo} />
          <StatBox label="Filled"    value={stats.filled}    accent={colorUp} />
          <StatBox label="Rejected"  value={stats.rejected}  accent={stats.rejected > 0 ? colorDown : undefined} />
          <StatBox label="Errored"   value={stats.errored}   accent={stats.errored > 0 ? colorPending : undefined} />
        </Stack>

        {/* Rate bars */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <RateBar label="Acceptance" value={acceptanceRate(stats)} color={colorUp} />
          <RateBar label="Fill"       value={fillRate(stats)}       color={colorInfo} />
          <RateBar label="Rejection"  value={rejectionRate(stats)}  color={colorDown} />
        </Stack>

        {/* Avg fill latency */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">Avg Fill Latency</Typography>
          <Typography variant="caption" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {latency !== null ? `${Math.round(latency)} ms` : '—'}
          </Typography>
        </Stack>

        {/* Error breakdown */}
        {stats.errorBreakdown.size > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" color="text.secondary" display="block" gutterBottom>
              Error Breakdown
            </Typography>
            <Table
              size="small"
              aria-label="error breakdown"
              sx={{
                '& .MuiTableHead-root .MuiTableCell-root': {
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                  py: 1,
                },
                '& .MuiTableBody-root .MuiTableCell-root': { py: 1 },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from(stats.errorBreakdown.entries()).map(([key, count]) => {
                  const [code, ...rest] = key.split('|');
                  return (
                    <TableRow key={key}>
                      <TableCell>{code}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{rest.join('|')}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{count}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
