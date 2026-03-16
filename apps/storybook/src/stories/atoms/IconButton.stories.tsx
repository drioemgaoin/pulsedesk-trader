import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { IconButton, Stack, Box, Tooltip, Typography } from '@pulsedesk/ui';
import {
  CancelIcon,
  DownloadIcon,
  FilterListIcon,
  MenuIcon,
} from '@pulsedesk/ui';

const meta: Meta<typeof IconButton> = {
  title: 'Atoms/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <Tooltip title="Cancel">
      <IconButton><CancelIcon /></IconButton>
    </Tooltip>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack direction="row" spacing={1} alignItems="center">
      {(['small', 'medium', 'large'] as const).map((size) => (
        <Tooltip key={size} title={`${size} size`}>
          <IconButton size={size}><MenuIcon /></IconButton>
        </Tooltip>
      ))}
    </Stack>
  ),
};

export const Colors: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      {(['default', 'primary', 'secondary', 'error', 'warning', 'success', 'info'] as const).map((color) => (
        <Tooltip key={color} title={color}>
          <IconButton color={color}><DownloadIcon /></IconButton>
        </Tooltip>
      ))}
    </Stack>
  ),
};

// ─── Individual states ────────────────────────────────────────────────────────

export const Hover: Story = {
  render: () => <IconButton color="primary"><MenuIcon /></IconButton>,
  parameters: { pseudo: { hover: true } },
};

export const FocusVisible: Story = {
  render: () => (
    <IconButton color="primary" className="Mui-focusVisible">
      <MenuIcon />
    </IconButton>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

export const Active: Story = {
  render: () => <IconButton color="primary"><MenuIcon /></IconButton>,
  parameters: { pseudo: { active: true } },
};

export const Disabled: Story = {
  render: () => (
    <IconButton disabled><FilterListIcon /></IconButton>
  ),
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      {ICON_COLORS.map((color) => (
        <IconButton key={color} color={color} className="Mui-focusVisible"><MenuIcon /></IconButton>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

export const HoverActive: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      {ICON_COLORS.map((color) => (
        <IconButton key={color} color={color}><MenuIcon /></IconButton>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, active: true } },
};

export const ActiveFocus: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      {ICON_COLORS.map((color) => (
        <IconButton key={color} color={color} className="Mui-focusVisible"><MenuIcon /></IconButton>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { active: true, focusVisible: true } },
};

// ─── All states matrix ────────────────────────────────────────────────────────

const ICON_COLORS = ['default', 'primary', 'error', 'success', 'warning'] as const;

export const AllStates: Story = {
  render: () => (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0} alignItems="center">
        <Box sx={{ width: 90 }} />
        {ICON_COLORS.map((c) => (
          <Box key={c} sx={{ width: 70, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{c}</Typography>
          </Box>
        ))}
      </Stack>
      {(['Default', 'Focus', 'Disabled'] as const).map((state) => (
        <Stack key={state} direction="row" spacing={0} alignItems="center">
          <Box sx={{ width: 90 }}>
            <Typography variant="caption" color="text.secondary">{state}</Typography>
          </Box>
          {ICON_COLORS.map((color) => (
            <Box key={color} sx={{ width: 70, display: 'flex', justifyContent: 'center' }}>
              <IconButton
                color={color}
                disabled={state === 'Disabled'}
                className={state === 'Focus' ? 'Mui-focusVisible' : undefined}
              >
                <MenuIcon />
              </IconButton>
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
    <Stack direction="row" spacing={1}>
      {ICON_COLORS.map((color) => (
        <IconButton key={color} color={color}><DownloadIcon /></IconButton>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true } },
};

export const ActiveAllColors: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      {ICON_COLORS.map((color) => (
        <IconButton key={color} color={color}><DownloadIcon /></IconButton>
      ))}
    </Stack>
  ),
  parameters: { pseudo: { active: true } },
};
