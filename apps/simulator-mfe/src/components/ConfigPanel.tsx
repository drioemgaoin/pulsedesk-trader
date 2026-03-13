import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  RadioGroup,
  Radio,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { TrafficProfile, ProfileConfig } from '../lib/generators';
import type { ScenarioType } from '../lib/scenarios';
import type { SimulatorStatus } from '../hooks/useSimulator';

const RATE_LIMIT = parseInt(
  (import.meta.env['VITE_RATE_LIMIT_PER_MIN'] as string | undefined) ?? '100',
  10,
);

const KNOWN_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN'];

interface FormValues {
  profile: TrafficProfile;
  burstCount: string;
  steadyRate: string;
  steadyDuration: string;
  rampMinRate: string;
  rampMaxRate: string;
  rampDuration: string;
  symbols: string[];
  maxConcurrency: number;
  scenario: ScenarioType;
}

interface ConfigPanelProps {
  status: SimulatorStatus;
  rateLimitWarning: boolean;
  onStart: (
    profile: ProfileConfig,
    symbols: string[],
    maxConcurrency: number,
    scenario: ScenarioType,
  ) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function ConfigPanel({
  status,
  rateLimitWarning,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
}: ConfigPanelProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      profile: 'Burst',
      burstCount: '10',
      steadyRate: '5',
      steadyDuration: '60',
      rampMinRate: '2',
      rampMaxRate: '10',
      rampDuration: '60',
      symbols: ['AAPL'],
      maxConcurrency: 5,
      scenario: 'Normal',
    },
  });

  const profile = watch('profile');
  const steadyRate = Number(watch('steadyRate'));
  const ratePerMin = profile === 'Steady' ? steadyRate * 60 : 0;
  const showRateLimitWarning = rateLimitWarning || ratePerMin > RATE_LIMIT;
  const isRunning = status === 'running' || status === 'paused';

  function onSubmit(data: FormValues) {
    let profileConfig: ProfileConfig;
    if (data.profile === 'Burst') {
      profileConfig = { profile: 'Burst', count: Number(data.burstCount) };
    } else if (data.profile === 'Steady') {
      profileConfig = {
        profile: 'Steady',
        ratePerSecond: Number(data.steadyRate),
        durationSeconds: Number(data.steadyDuration),
      };
    } else {
      profileConfig = {
        profile: 'Ramp',
        minRatePerSecond: Number(data.rampMinRate),
        maxRatePerSecond: Number(data.rampMaxRate),
        durationSeconds: Number(data.rampDuration),
      };
    }
    onStart(profileConfig, data.symbols, data.maxConcurrency, data.scenario);
  }

  return (
    <Card variant="outlined" sx={{ height: '100%', overflow: 'auto' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Configuration
        </Typography>

        {showRateLimitWarning && (
          <Alert severity="warning" sx={{ mb: 2 }} role="alert">
            Configured rate may exceed the gateway rate limit ({RATE_LIMIT} req/min).
          </Alert>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          aria-label="simulator configuration form"
          noValidate
        >
          <Stack spacing={2.5}>
            {/* Traffic profile */}
            <Box>
              <FormLabel>Traffic Profile</FormLabel>
              <Controller
                name="profile"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={field.value}
                    onChange={(_, v: TrafficProfile) => {
                      if (v) field.onChange(v);
                    }}
                    aria-label="traffic profile"
                    sx={{ mt: 0.5, display: 'flex' }}
                  >
                    {(['Burst', 'Steady', 'Ramp'] as TrafficProfile[]).map((p) => (
                      <ToggleButton key={p} value={p} sx={{ flex: 1 }}>
                        {p}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
              />
            </Box>

            {/* Profile-specific inputs */}
            {profile === 'Burst' && (
              <Controller
                name="burstCount"
                control={control}
                rules={{
                  required: 'Required',
                  validate: (v) => {
                    const n = Number(v);
                    return (n >= 1 && n <= 500) || 'Must be 1–500';
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Order Count (1–500)"
                    type="number"
                    size="small"
                    error={!!errors.burstCount}
                    helperText={errors.burstCount?.message}
                    inputProps={{ 'aria-label': 'burst order count' }}
                  />
                )}
              />
            )}

            {profile === 'Steady' && (
              <Stack spacing={1.5}>
                <Controller
                  name="steadyRate"
                  control={control}
                  rules={{
                    validate: (v) => {
                      const n = Number(v);
                      return (n >= 1 && n <= 50) || 'Must be 1–50';
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Rate (orders/s, 1–50)"
                      type="number"
                      size="small"
                      error={!!errors.steadyRate}
                      helperText={errors.steadyRate?.message}
                      inputProps={{ 'aria-label': 'steady rate' }}
                    />
                  )}
                />
                <Controller
                  name="steadyDuration"
                  control={control}
                  rules={{
                    validate: (v) => {
                      const n = Number(v);
                      return (n >= 10 && n <= 300) || 'Must be 10–300';
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Duration (s, 10–300)"
                      type="number"
                      size="small"
                      error={!!errors.steadyDuration}
                      helperText={errors.steadyDuration?.message}
                      inputProps={{ 'aria-label': 'steady duration' }}
                    />
                  )}
                />
              </Stack>
            )}

            {profile === 'Ramp' && (
              <Stack spacing={1.5}>
                <Controller
                  name="rampMinRate"
                  control={control}
                  rules={{
                    validate: (v) => {
                      const n = Number(v);
                      return (n >= 1 && n <= 20) || 'Must be 1–20';
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Min Rate (1–20)"
                      type="number"
                      size="small"
                      error={!!errors.rampMinRate}
                      helperText={errors.rampMinRate?.message}
                      inputProps={{ 'aria-label': 'ramp min rate' }}
                    />
                  )}
                />
                <Controller
                  name="rampMaxRate"
                  control={control}
                  rules={{
                    validate: (v) => {
                      const n = Number(v);
                      return (n >= 5 && n <= 50) || 'Must be 5–50';
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Max Rate (5–50)"
                      type="number"
                      size="small"
                      error={!!errors.rampMaxRate}
                      helperText={errors.rampMaxRate?.message}
                      inputProps={{ 'aria-label': 'ramp max rate' }}
                    />
                  )}
                />
                <Controller
                  name="rampDuration"
                  control={control}
                  rules={{
                    validate: (v) => {
                      const n = Number(v);
                      return (n >= 30 && n <= 300) || 'Must be 30–300';
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Duration (s, 30–300)"
                      type="number"
                      size="small"
                      error={!!errors.rampDuration}
                      helperText={errors.rampDuration?.message}
                      inputProps={{ 'aria-label': 'ramp duration' }}
                    />
                  )}
                />
              </Stack>
            )}

            {/* Symbol mix */}
            <Box>
              <FormLabel>Symbol Mix</FormLabel>
              <Controller
                name="symbols"
                control={control}
                rules={{ validate: (v) => v.length > 0 || 'Select at least one symbol' }}
                render={({ field }) => (
                  <FormGroup row>
                    {KNOWN_SYMBOLS.map((sym) => (
                      <FormControlLabel
                        key={sym}
                        label={sym}
                        control={
                          <Checkbox
                            size="small"
                            checked={field.value.includes(sym)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...field.value, sym]
                                : field.value.filter((s: string) => s !== sym);
                              field.onChange(next);
                            }}
                            inputProps={{ 'aria-label': `symbol ${sym}` }}
                          />
                        }
                      />
                    ))}
                  </FormGroup>
                )}
              />
              {errors.symbols && (
                <FormHelperText error>{errors.symbols.message}</FormHelperText>
              )}
            </Box>

            {/* Max concurrency */}
            <Box>
              <FormLabel>Max Concurrency: {watch('maxConcurrency')}</FormLabel>
              <Controller
                name="maxConcurrency"
                control={control}
                render={({ field }) => (
                  <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={field.value}
                    onChange={(_, v) => field.onChange(v)}
                    marks
                    aria-label="max concurrency"
                  />
                )}
              />
            </Box>

            {/* Scenario */}
            <Box>
              <FormLabel>Scenario</FormLabel>
              <Controller
                name="scenario"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} aria-label="scenario">
                    {(
                      [
                        'Normal',
                        'HighVolume',
                        'LimitExceeded',
                        'DuplicateKeys',
                        'InvalidPayload',
                      ] as ScenarioType[]
                    ).map((s) => (
                      <FormControlLabel
                        key={s}
                        value={s}
                        label={s}
                        control={<Radio size="small" />}
                      />
                    ))}
                  </RadioGroup>
                )}
              />
            </Box>

            {/* Controls */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {!isRunning && (
                <Button
                  type="submit"
                  variant="contained"
                  aria-label="start simulation"
                >
                  {status === 'stopped' ? 'Restart' : 'Start'}
                </Button>
              )}
              {status === 'running' && (
                <Button variant="outlined" onClick={onPause} aria-label="pause simulation">
                  Pause
                </Button>
              )}
              {status === 'paused' && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={onResume}
                  aria-label="resume simulation"
                >
                  Resume
                </Button>
              )}
              {isRunning && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={onStop}
                  aria-label="stop simulation"
                >
                  Stop
                </Button>
              )}
              {status === 'stopped' && (
                <Button variant="text" onClick={onReset} aria-label="reset simulation">
                  Reset
                </Button>
              )}
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
