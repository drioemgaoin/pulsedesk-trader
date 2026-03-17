import {
  Autocomplete,
  Box,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  FilterChip,
  tradeSideToggleSx,
} from '@pulsedesk/ui';
import { ALL_STATUSES, KNOWN_SYMBOLS } from '../lib/filters';
import type { OrderFilters, OrderStatus } from '../lib/filters';

export interface SideFilterProps {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
}

export function SideFilter({ filters, onChange }: SideFilterProps) {
  function toggleStatus(status: OrderStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Status
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {ALL_STATUSES.map((s) => (
            <FilterChip
              key={s}
              status={s}
              isActive={filters.statuses.includes(s)}
              onClick={() => toggleStatus(s)}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Side
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          fullWidth
          value={filters.side}
          onChange={(_, v) => { if (v) onChange({ ...filters, side: v }); }}
          aria-label="side filter"
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="BUY" sx={tradeSideToggleSx('BUY')}>Buy</ToggleButton>
          <ToggleButton value="SELL" sx={tradeSideToggleSx('SELL')}>Sell</ToggleButton>
        </ToggleButtonGroup>
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
            <TextField
              {...params}
              placeholder="Any symbol"
              inputProps={{ ...params.inputProps, 'aria-label': 'symbol filter' }}
            />
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
