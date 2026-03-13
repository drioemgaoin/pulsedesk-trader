import { Box, Card, CardContent, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { acceptanceRate, avgFillLatency, fillRate, rejectionRate } from '../lib/stats';
import type { SimulatorStats } from '../lib/stats';

interface LiveStatsProps {
  stats: SimulatorStats;
  elapsedMs: number;
  fired: number;
  total: number | null;
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center', minWidth: 80 }}>
      <Typography variant="h5" fontWeight={700} aria-label={`${label}: ${value}`}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: color } }}
        aria-label={`${label} ${pct}%`}
      />
    </Box>
  );
}

export function LiveStats({ stats, elapsedMs, fired, total }: LiveStatsProps) {
  const latency = avgFillLatency(stats);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6">Live Stats</Typography>
          <Typography variant="body2" color="text.secondary" aria-label="elapsed time">
            ⏱ {elapsedSec}s{total ? ` · ${fired}/${total} fired` : ` · ${fired} fired`}
          </Typography>
        </Stack>

        {/* Counters */}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <StatBox label="Submitted" value={stats.submitted} />
          <StatBox label="Accepted" value={stats.accepted} />
          <StatBox label="Filled" value={stats.filled} />
          <StatBox label="Rejected" value={stats.rejected} />
          <StatBox label="Errored" value={stats.errored} />
        </Stack>

        {/* Rate bars */}
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <RateBar label="Acceptance %" value={acceptanceRate(stats)} color="#26a69a" />
          <RateBar label="Fill %" value={fillRate(stats)} color="#42a5f5" />
          <RateBar label="Rejection %" value={rejectionRate(stats)} color="#ef5350" />
        </Stack>

        {/* Average fill latency */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Avg Fill Latency:{' '}
          <Typography component="span" variant="body2" fontWeight={600}>
            {latency !== null ? `${Math.round(latency)} ms` : '—'}
          </Typography>
        </Typography>

        {/* Error breakdown */}
        {stats.errorBreakdown.size > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Error Breakdown
            </Typography>
            <Table size="small" aria-label="error breakdown">
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
                      <TableCell>{rest.join('|')}</TableCell>
                      <TableCell align="right">{count}</TableCell>
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
