import React from "react";
import {
  Autocomplete,
  Box,
  Chip,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  tradeSideToggleSx,
} from "@pulsedesk/ui";
import { KNOWN_SYMBOLS } from "../lib/filters";
import type { OrderFilters } from "../lib/filters";

export interface SideFilterProps {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.disabled"
      sx={{ display: "block", mb: 2, lineHeight: 1, letterSpacing: "0.1em" }}
    >
      {children}
    </Typography>
  );
}

// ─── SideFilter ───────────────────────────────────────────────────────────────
// Secondary filters rendered in the "More Filters" drawer.
// Status is intentionally excluded — it lives in the primary filter bar.

export function SideFilter({ filters, onChange }: SideFilterProps) {
  return (
    <Stack divider={<Divider />}>
      {/* ── Side ── */}
      <Box sx={{ py: 3 }}>
        <SectionLabel>Side</SectionLabel>
        <ToggleButtonGroup
          size="small"
          exclusive
          fullWidth
          value={filters.side}
          onChange={(_, v) => {
            if (v) onChange({ ...filters, side: v });
          }}
          aria-label="side filter"
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="BUY" sx={tradeSideToggleSx("BUY")}>
            Buy
          </ToggleButton>
          <ToggleButton value="SELL" sx={tradeSideToggleSx("SELL")}>
            Sell
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Symbol ── */}
      <Box sx={{ py: 3 }}>
        <SectionLabel>Symbol</SectionLabel>
        <Autocomplete
          multiple
          size="small"
          options={KNOWN_SYMBOLS}
          value={filters.symbols}
          onChange={(_, value) => onChange({ ...filters, symbols: value })}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={filters.symbols.length === 0 ? "Any symbol" : ""}
              slotProps={{
                htmlInput: {
                  ...params.inputProps,
                  "aria-label": "symbol filter",
                },
              }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                size="small"
                {...getTagProps({ index })}
                key={option}
              />
            ))
          }
          sx={{ mt: 3 }}
        />
      </Box>

      {/* ── Date Range ── */}
      <Box sx={{ py: 3 }}>
        <SectionLabel>Date Range</SectionLabel>
        <Stack spacing={5} sx={{ mt: 5 }}>
          <TextField
            size="small"
            label="From"
            type="date"
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { "aria-label": "date from" },
            }}
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { "aria-label": "date to" },
            }}
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
