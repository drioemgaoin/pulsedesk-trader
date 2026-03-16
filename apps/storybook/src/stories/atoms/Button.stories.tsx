import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Button>;

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { children: 'Click me', variant: 'contained' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={3}>
      {(['contained', 'outlined', 'text'] as const).map((variant) => (
        <Stack key={variant} direction="row" spacing={2} alignItems="center">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <Button key={size} variant={variant} size={size}>
              {variant} {size}
            </Button>
          ))}
        </Stack>
      ))}
    </Stack>
  ),
};

// ─── Individual states (CSS pseudo-states forced by addon) ───────────────────

export const Hover: Story = {
  args: { children: 'Hover', variant: 'contained' },
  parameters: { pseudo: { hover: true } },
};

export const FocusVisible: Story = {
  args: { children: 'Focus', variant: 'contained', className: 'Mui-focusVisible' },
  parameters: { pseudo: { focusVisible: true } },
};

export const Active: Story = {
  args: { children: 'Active', variant: 'contained' },
  parameters: { pseudo: { active: true } },
};

export const Disabled: Story = {
  args: { children: 'Disabled', variant: 'contained', disabled: true },
};

export const Loading: Story = {
  args: { children: 'Loading', variant: 'contained', loading: true },
};

// ─── All states × variants matrix ────────────────────────────────────────────

const STATE_LABELS = ['Default', 'Hover', 'Focus', 'Active', 'Disabled', 'Loading'] as const;
const VARIANTS = ['contained', 'outlined', 'text'] as const;

/** Static matrix — hover/active rows use Mui class overrides where possible. */
export const AllStates: Story = {
  render: () => (
    <Stack spacing={1}>
      {/* header */}
      <Stack direction="row" spacing={0}>
        <Box sx={{ width: 80 }} />
        {VARIANTS.map((v) => (
          <Box key={v} sx={{ width: 120, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{v}</Typography>
          </Box>
        ))}
      </Stack>
      {STATE_LABELS.map((state) => (
        <Stack key={state} direction="row" spacing={0} alignItems="center">
          <Box sx={{ width: 80 }}>
            <Typography variant="caption" color="text.secondary">{state}</Typography>
          </Box>
          {VARIANTS.map((variant) => (
            <Box key={variant} sx={{ width: 120, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant={variant}
                disabled={state === 'Disabled'}
                loading={state === 'Loading'}
                className={state === 'Focus' ? 'Mui-focusVisible' : undefined}
              >
                {state}
              </Button>
            </Box>
          ))}
        </Stack>
      ))}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        * Hover and Active states shown in dedicated stories (CSS pseudo-states)
      </Typography>
    </Stack>
  ),
};

// ─── State combinations ───────────────────────────────────────────────────────

/** Hover while focused (tabbing to a button then moving the mouse over it) */
export const HoverFocus: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      {VARIANTS.map((v) => (
        <Button key={v} variant={v} className="Mui-focusVisible">{v}</Button>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

/** Active while focused (pressing Enter/Space on a focused button) */
export const ActiveFocus: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      {VARIANTS.map((v) => (
        <Button key={v} variant={v} className="Mui-focusVisible">{v}</Button>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { active: true, focusVisible: true } },
};

/** Hover + Active (mouse pressed while hovering — the click moment) */
export const HoverActive: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      {VARIANTS.map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, active: true } },
};

// ─── Hover across variants ────────────────────────────────────────────────────

export const HoverAllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      {VARIANTS.map((variant) => (
        <Button key={variant} variant={variant}>{variant}</Button>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true } },
};

export const ActiveAllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      {VARIANTS.map((variant) => (
        <Button key={variant} variant={variant}>{variant}</Button>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { active: true } },
};

// ─── Semantic colors ──────────────────────────────────────────────────────────

export const SemanticColors: Story = {
  render: () => (
    <Stack direction="row" spacing={2} flexWrap="wrap">
      {(['primary', 'success', 'error', 'warning', 'info'] as const).map((color) => (
        <Button key={color} variant="contained" color={color}>{color}</Button>
      ))}
    </Stack>
  ),
};

export const SemanticColorsHover: Story = {
  render: () => (
    <Stack direction="row" spacing={2} flexWrap="wrap">
      {(['primary', 'success', 'error', 'warning', 'info'] as const).map((color) => (
        <Button key={color} variant="contained" color={color}>{color}</Button>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true } },
};

export const FullWidth: Story = {
  render: () => (
    <Box sx={{ maxWidth: 320 }}>
      <Button variant="contained" fullWidth>Full Width</Button>
    </Box>
  ),
};
