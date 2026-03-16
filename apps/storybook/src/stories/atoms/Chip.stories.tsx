import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Chip, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof Chip> = {
  title: 'Atoms/Chip',
  component: Chip,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Chip>;

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { label: 'Chip', color: 'primary' },
};

export const AllColors: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {(['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'] as const).map((color) => (
        <Chip key={color} label={color} color={color} />
      ))}
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip label="Small" size="small" color="primary" />
      <Chip label="Medium" size="medium" color="primary" />
    </Stack>
  ),
};

export const Variants: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <Chip label="Filled" variant="filled" color="primary" />
      <Chip label="Outlined" variant="outlined" color="primary" />
    </Stack>
  ),
};

// ─── Individual states (clickable chips only) ─────────────────────────────────

export const Hover: Story = {
  args: { label: 'Hover', color: 'primary', onClick: () => {} },
  parameters: { pseudo: { hover: true } },
};

export const FocusVisible: Story = {
  args: { label: 'Focus', color: 'primary', onClick: () => {}, className: 'Mui-focusVisible' },
  parameters: { pseudo: { focusVisible: true } },
};

export const Active: Story = {
  args: { label: 'Active', color: 'primary', onClick: () => {} },
  parameters: { pseudo: { active: true } },
};

export const Disabled: Story = {
  args: { label: 'Disabled', color: 'primary', disabled: true },
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {COLORS.map((color) => (
        <Chip key={color} label={color} color={color} onClick={() => {}} className="Mui-focusVisible" />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

export const HoverActive: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {COLORS.map((color) => (
        <Chip key={color} label={color} color={color} onClick={() => {}} />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, active: true } },
};

export const ActiveFocus: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {COLORS.map((color) => (
        <Chip key={color} label={color} color={color} onClick={() => {}} className="Mui-focusVisible" />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { active: true, focusVisible: true } },
};

// ─── All states matrix ────────────────────────────────────────────────────────

const COLORS = ['primary', 'secondary', 'success', 'error', 'warning'] as const;

export const AllStatesClickable: Story = {
  render: () => (
    <Stack spacing={2}>
      <Stack direction="row" spacing={0} alignItems="center">
        <Box sx={{ width: 90 }} />
        {COLORS.map((c) => (
          <Box key={c} sx={{ width: 100, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{c}</Typography>
          </Box>
        ))}
      </Stack>
      {(['Default', 'Focus', 'Disabled'] as const).map((state) => (
        <Stack key={state} direction="row" spacing={0} alignItems="center">
          <Box sx={{ width: 90 }}>
            <Typography variant="caption" color="text.secondary">{state}</Typography>
          </Box>
          {COLORS.map((color) => (
            <Box key={color} sx={{ width: 100, display: 'flex', justifyContent: 'center' }}>
              <Chip
                label={state}
                color={color}
                onClick={state !== 'Disabled' ? () => {} : undefined}
                disabled={state === 'Disabled'}
                className={state === 'Focus' ? 'Mui-focusVisible' : undefined}
              />
            </Box>
          ))}
        </Stack>
      ))}
      <Typography variant="caption" color="text.secondary">
        * Hover and Active shown in dedicated stories
      </Typography>
    </Stack>
  ),
};

export const HoverAllColors: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {COLORS.map((color) => (
        <Chip key={color} label={color} color={color} onClick={() => {}} />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true } },
};
