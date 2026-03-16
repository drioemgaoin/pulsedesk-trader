import {
  Autocomplete,
  Box,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@pulsedesk/ui';
import { ALL_STATUSES, KNOWN_SYMBOLS } from '../lib/filters';
import type { OrderFilters, OrderStatus } from '../lib/filters';
import type { OrderSide } from '../api/types';

interface FilterPanelProps {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
}

const STATUS_COLOURS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  FILLED: 'success',
  PARTIALLY_FILLED: 'info',
  REJECTED: 'error',
  CANCELLED: 'default',
};

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  function toggleStatus(status: OrderStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  }

  return (
    <Stack spacing={2} sx={{ p: 2, minWidth: 220 }}>
      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Status
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {ALL_STATUSES.map((s) => (
            <Chip
              key={s}
              label={s}
              size="small"
              color={filters.statuses.includes(s) ? STATUS_COLOURS[s] ?? 'default' : 'default'}
              variant={filters.statuses.includes(s) ? 'filled' : 'outlined'}
              onClick={() => toggleStatus(s)}
              aria-pressed={filters.statuses.includes(s)}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Symbol
        </Typography>
        <Autocomplete
          multiple
          size="small"
          options={KNOWN_SYMBOLS}
          value={filters.symbols}
          onChange={(_, value) => onChange({ ...filters, symbols: value })}
          renderInput={(params) => (
            <TextField {...params} placeholder="Any" inputProps={{ ...params.inputProps, 'aria-label': 'symbol filter' }} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
            ))
          }
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Side
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filters.side}
          onChange={(_, v: OrderSide | 'ALL') => { if (v) onChange({ ...filters, side: v }); }}
          aria-label="side filter"
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="BUY">Buy</ToggleButton>
          <ToggleButton value="SELL">Sell</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Date Range
        </Typography>
        <Stack spacing={1}>
          <TextField
            size="small"
            label="From"
            type="date"
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': 'date from' }}
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': 'date to' }}
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
