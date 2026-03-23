import { useForm, Controller } from 'react-hook-form';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
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
  ExpandMoreIcon,
} from '@pulsedesk/ui';
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const profile = watch('profile');
  const steadyRate = Number(watch('steadyRate'));
  const ratePerMin = profile === 'Steady' ? steadyRate * 60 : 0;
  const showRateLimitWarning = rateLimitWarning || ratePerMin > RATE_LIMIT;
  const isRunning = status === 'running' || status === 'paused';
  const isDisabled = isRunning;

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
    <Card
      variant="outlined"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Configuration
        </Typography>
      </Box>

      {/* ── Scrollable form body ── */}
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        aria-label="simulator configuration form"
        noValidate
        sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ flex: 1 }}>
          {showRateLimitWarning && (
            <Alert severity="warning" sx={{ mx: 2, mt: 1.5 }} role="alert">
              Configured rate may exceed the gateway rate limit ({RATE_LIMIT} req/min).
            </Alert>
          )}

          {/* ── Profile accordion (default open) ── */}
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="profile-content" id="profile-header">
              <Typography variant="body2" fontWeight={600}>Traffic Profile</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={2}>
                <Controller
                  name="profile"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={field.value}
                      onChange={(_, v: TrafficProfile) => { if (v) field.onChange(v); }}
                      aria-label="traffic profile"
                      sx={{ display: 'flex' }}
                      disabled={isDisabled}
                    >
                      {(['Burst', 'Steady', 'Ramp'] as TrafficProfile[]).map((p) => (
                        <ToggleButton key={p} value={p} sx={{ flex: 1 }}>
                          {p}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  )}
                />

                {/* Profile-specific inputs — shown inline under the toggle */}
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
                        disabled={isDisabled}
                        error={!!errors.burstCount}
                        helperText={errors.burstCount?.message}
                        inputProps={{ 'aria-label': 'burst order count' }}
                      />
                    )}
                  />
                )}

                {profile === 'Steady' && (
                  <Stack spacing={2}>
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
                          disabled={isDisabled}
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
                          disabled={isDisabled}
                          error={!!errors.steadyDuration}
                          helperText={errors.steadyDuration?.message}
                          inputProps={{ 'aria-label': 'steady duration' }}
                        />
                      )}
                    />
                  </Stack>
                )}

                {profile === 'Ramp' && (
                  <Stack spacing={2}>
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
                          disabled={isDisabled}
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
                          disabled={isDisabled}
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
                          disabled={isDisabled}
                          error={!!errors.rampDuration}
                          helperText={errors.rampDuration?.message}
                          inputProps={{ 'aria-label': 'ramp duration' }}
                        />
                      )}
                    />
                  </Stack>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Divider />

          {/* ── Symbols & Scenario accordion ── */}
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="symbols-content" id="symbols-header">
              <Typography variant="body2" fontWeight={600}>Symbols &amp; Scenario</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={2}>
                <Box>
                  <FormLabel sx={{ typography: 'caption', color: 'text.secondary' }}>Symbol Mix</FormLabel>
                  <Controller
                    name="symbols"
                    control={control}
                    rules={{ validate: (v) => v.length > 0 || 'Select at least one symbol' }}
                    render={({ field }) => (
                      <FormGroup row sx={{ mt: 0.5 }}>
                        {KNOWN_SYMBOLS.map((sym) => (
                          <FormControlLabel
                            key={sym}
                            label={sym}
                            sx={{ mr: 1 }}
                            control={
                              <Checkbox
                                size="small"
                                disabled={isDisabled}
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

                <Box>
                  <FormLabel sx={{ typography: 'caption', color: 'text.secondary' }}>Scenario</FormLabel>
                  <Controller
                    name="scenario"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup {...field} aria-label="scenario" sx={{ mt: 0.5 }}>
                        {(
                          ['Normal', 'HighVolume', 'LimitExceeded', 'DuplicateKeys', 'InvalidPayload'] as ScenarioType[]
                        ).map((s) => (
                          <FormControlLabel
                            key={s}
                            value={s}
                            label={s}
                            disabled={isDisabled}
                            control={<Radio size="small" />}
                            sx={{ my: -0.25 }}
                          />
                        ))}
                      </RadioGroup>
                    )}
                  />
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Divider />

          {/* ── Advanced accordion (collapsed by default) ── */}
          <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="advanced-content" id="advanced-header">
              <Typography variant="body2" fontWeight={600}>Advanced</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box>
                <FormLabel sx={{ typography: 'caption', color: 'text.secondary' }}>
                  Max Concurrency: {watch('maxConcurrency')}
                </FormLabel>
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
                      disabled={isDisabled}
                      aria-label="max concurrency"
                      sx={{ mt: 1 }}
                    />
                  )}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* ── Sticky controls — always visible, never scroll off ── */}
        <Box
          sx={{
            px: 2,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'var(--pd-bg-surface)',
            flexShrink: 0,
          }}
        >
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
              <Button variant="outlined" color="primary" onClick={onResume} aria-label="resume simulation">
                Resume
              </Button>
            )}
            {isRunning && (
              <Button variant="outlined" color="error" onClick={onStop} aria-label="stop simulation">
                Stop
              </Button>
            )}
            {status === 'stopped' && (
              <Button variant="text" onClick={onReset} aria-label="reset simulation">
                Reset
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Card>
  );
}
