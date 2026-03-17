/**
 * Shared helpers for Chip.stories.tsx and PulsingChip.stories.tsx.
 *
 * Changing layout (padding, column widths, typography styles) here automatically
 * updates both story files, keeping them visually consistent.
 */
import React from 'react';
import { Chip, PulsingChip, Stack, Box, Typography } from '@pulsedesk/ui';
import type { ChipProps } from '@pulsedesk/ui';

// ─── Shared constants ─────────────────────────────────────────────────────────

export const CHIP_COLORS   = ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'] as const;
export const CHIP_VARIANTS = ['filled', 'outlined'] as const;

/**
 * PulsingChip supports only the 4 semantic colors that map to connection states.
 * (default / primary / secondary don't apply to transient system states.)
 */
export const PULSING_CHIP_COLORS = ['warning', 'error', 'success', 'info'] as const;

export type ChipColor        = typeof CHIP_COLORS[number];
export type ChipVariant      = typeof CHIP_VARIANTS[number];
export type PulsingChipColor = typeof PULSING_CHIP_COLORS[number];

// ─── ChipStateMatrix ──────────────────────────────────────────────────────────
// Variants (rows) × colors (columns) grid. Used by Chip.stories.tsx.

export function ChipStateMatrix(stateProps: Omit<ChipProps, 'variant' | 'color' | 'label'>) {
  return (
    <Stack spacing={0}>
      {/* column headers */}
      <Stack direction="row">
        <Box sx={{ width: 80, flexShrink: 0 }} />
        {CHIP_COLORS.map((color) => (
          <Box key={color} sx={{ width: 110, pl: '8px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {color}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* one row per variant */}
      {CHIP_VARIANTS.map((variant: ChipVariant) => (
        <Stack key={variant} direction="row" alignItems="center">
          <Box sx={{ width: 80, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {variant}
            </Typography>
          </Box>
          {CHIP_COLORS.map((color: ChipColor) => (
            <Box key={color} sx={{ width: 110, p: '8px' }}>
              <Chip variant={variant} color={color} label={color} {...stateProps} />
            </Box>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

// ─── PulsingColorRow ──────────────────────────────────────────────────────────
// All 4 supported pulsing colors in a row. Used by PulsingChip.stories.tsx.
// durationMs is forwarded so animation-speed stories can reuse the same layout.

export function PulsingColorRow({ durationMs }: { durationMs?: number }) {
  return (
    <Stack direction="row">
      {PULSING_CHIP_COLORS.map((color: PulsingChipColor) => (
        <Box key={color} sx={{ p: '8px' }}>
          <PulsingChip label={color.toUpperCase()} color={color} durationMs={durationMs} />
        </Box>
      ))}
    </Stack>
  );
}
