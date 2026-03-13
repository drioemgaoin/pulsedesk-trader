import { useSelector } from 'react-redux';
import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { useSimulator } from './hooks/useSimulator';
import { ConfigPanel } from './components/ConfigPanel';
import { LiveStats } from './components/LiveStats';
import { LiveFeed } from './components/LiveFeed';
import { ObservabilityLinks } from './components/ObservabilityLinks';
import type { ProfileConfig } from './lib/generators';
import type { ScenarioType } from './lib/scenarios';
import type { ShellState } from './types/store';

export default function SimulatorPage() {
  const token = useSelector((s: ShellState) => s.auth.token) ?? '';
  const accountId = useSelector((s: ShellState) => s.auth.accountId) ?? 'acc-001';

  const { state, start, pause, resume, stop, reset } = useSimulator();

  function handleStart(
    profile: ProfileConfig,
    symbols: string[],
    maxConcurrency: number,
    scenario: ScenarioType,
  ) {
    void start({ profile, symbols, maxConcurrency, scenario, accountId, token });
  }

  const isActive = state.status === 'running' || state.status === 'paused';
  const progressPct =
    state.total && state.total > 0
      ? Math.min(100, Math.round((state.fired / state.total) * 100))
      : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 2 }}>
      <Typography variant="h5" component="h1" tabIndex={-1} gutterBottom>
        Load Simulator
      </Typography>

      {/* Progress bar */}
      {isActive && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant={progressPct !== null ? 'determinate' : 'indeterminate'}
            value={progressPct ?? undefined}
            aria-label={`progress ${progressPct ?? 0}%`}
          />
          {progressPct !== null && (
            <Typography variant="caption" color="text.secondary">
              {state.fired} / {state.total} orders fired ({progressPct}%)
            </Typography>
          )}
        </Box>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left: Config */}
        <Box sx={{ width: { xs: '100%', md: '38%' }, flexShrink: 0 }}>
          <ConfigPanel
            status={state.status}
            rateLimitWarning={state.rateLimitWarning}
            onStart={handleStart}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            onReset={reset}
          />
        </Box>

        {/* Right: Stats + Feed + Observability */}
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <LiveStats
            stats={state.stats}
            elapsedMs={state.elapsedMs}
            fired={state.fired}
            total={state.total}
          />

          <Card variant="outlined">
            <CardContent sx={{ pb: '8px !important' }}>
              <LiveFeed rows={state.feed} />
            </CardContent>
          </Card>

          <ObservabilityLinks />
        </Stack>
      </Stack>
    </Box>
  );
}
