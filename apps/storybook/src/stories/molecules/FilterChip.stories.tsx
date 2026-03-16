import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { FilterChip, Stack, Box, Typography } from '@pulsedesk/ui';
import type { OrderStatus } from '@pulsedesk/ui';

const meta: Meta<typeof FilterChip> = {
  title: 'Molecules/FilterChip',
  component: FilterChip,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof FilterChip>;

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'FILLED',
  'PARTIALLY_FILLED',
  'REJECTED',
  'CANCELLED',
];

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { status: 'FILLED', isActive: true },
};

export const AllStatuses: Story = {
  render: () => {
    const [active, setActive] = useState<Set<OrderStatus>>(new Set(['FILLED', 'PENDING']));
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {ALL_STATUSES.map((status) => (
          <FilterChip
            key={status}
            status={status}
            isActive={active.has(status)}
            onClick={() => {
              setActive((prev) => {
                const next = new Set(prev);
                if (next.has(status)) next.delete(status);
                else next.add(status);
                return next;
              });
            }}
          />
        ))}
      </Stack>
    );
  },
};

// ─── Active vs Inactive ───────────────────────────────────────────────────────

export const ActiveVsInactive: Story = {
  render: () => (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">Active (pressed)</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {ALL_STATUSES.map((status) => (
          <FilterChip key={status} status={status} isActive />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Inactive (not pressed)</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {ALL_STATUSES.map((status) => (
          <FilterChip key={status} status={status} isActive={false} />
        ))}
      </Stack>
    </Stack>
  ),
};

// ─── Hover states ─────────────────────────────────────────────────────────────

export const HoverInactive: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip key={status} status={status} isActive={false} onClick={() => {}} />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true } },
};

export const HoverActive: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip key={status} status={status} isActive onClick={() => {}} />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true } },
};

// ─── Focus state ──────────────────────────────────────────────────────────────

export const FocusVisible: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip
          key={status}
          status={status}
          isActive={false}
          onClick={() => {}}
          className="Mui-focusVisible"
        />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

export const FocusVisibleActive: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip
          key={status}
          status={status}
          isActive
          onClick={() => {}}
          className="Mui-focusVisible"
        />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocusInactive: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip key={status} status={status} isActive={false} onClick={() => {}} className="Mui-focusVisible" />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

export const HoverFocusActive: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip key={status} status={status} isActive onClick={() => {}} className="Mui-focusVisible" />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

export const ActivePressInactive: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip key={status} status={status} isActive={false} onClick={() => {}} />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { active: true } },
};

export const ActivePressActiveChip: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <FilterChip key={status} status={status} isActive onClick={() => {}} />
      ))}
    </Stack>
  ),
  parameters: { pseudo: { active: true } },
};

// ─── All states matrix ────────────────────────────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <Stack spacing={2}>
      {([
        { label: 'Default — Inactive', isActive: false, className: undefined },
        { label: 'Default — Active', isActive: true, className: undefined },
        { label: 'Focus — Inactive', isActive: false, className: 'Mui-focusVisible' },
        { label: 'Focus — Active', isActive: true, className: 'Mui-focusVisible' },
      ]).map(({ label, isActive, className }) => (
        <Box key={label}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{label}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {ALL_STATUSES.map((status) => (
              <FilterChip
                key={status}
                status={status}
                isActive={isActive}
                onClick={() => {}}
                className={className}
              />
            ))}
          </Stack>
        </Box>
      ))}
      <Typography variant="caption" color="text.secondary">
        * Hover shown in HoverInactive and HoverActive stories
      </Typography>
    </Stack>
  ),
};
