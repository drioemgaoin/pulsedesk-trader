import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ToggleButton, ToggleButtonGroup, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof ToggleButton> = {
  title: 'Atoms/ToggleButton',
  component: ToggleButton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ToggleButton>;

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('all');
    return (
      <ToggleButtonGroup exclusive value={value} onChange={(_, v) => { if (v) setValue(v); }}>
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="buy">Buy</ToggleButton>
        <ToggleButton value="sell">Sell</ToggleButton>
      </ToggleButtonGroup>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack spacing={2}>
      {(['small', 'medium', 'large'] as const).map((size) => {
        const [value, setValue] = useState('a');
        return (
          <ToggleButtonGroup
            key={size}
            exclusive
            size={size}
            value={value}
            onChange={(_, v) => { if (v) setValue(v); }}
          >
            <ToggleButton value="a">Option A</ToggleButton>
            <ToggleButton value="b">Option B</ToggleButton>
            <ToggleButton value="c">Option C</ToggleButton>
          </ToggleButtonGroup>
        );
      })}
    </Stack>
  ),
};

// ─── Individual states ────────────────────────────────────────────────────────

/** Unselected — default resting state */
export const Unselected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null}>
      <ToggleButton value="a">Option A</ToggleButton>
      <ToggleButton value="b">Option B</ToggleButton>
    </ToggleButtonGroup>
  ),
};

/** Selected — Mui-selected applied via prop */
export const Selected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="a">
      <ToggleButton value="a" selected>Selected</ToggleButton>
      <ToggleButton value="b">Unselected</ToggleButton>
    </ToggleButtonGroup>
  ),
};

/** Hover on unselected button */
export const HoverUnselected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null}>
      <ToggleButton value="a">Option A</ToggleButton>
      <ToggleButton value="b">Option B</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true } },
};

/** Hover on selected button — most important to check contrast */
export const HoverSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="a">
      <ToggleButton value="a" selected>Selected</ToggleButton>
      <ToggleButton value="b">Other</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true } },
};

export const FocusVisible: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null}>
      <ToggleButton value="a" className="Mui-focusVisible">Focused</ToggleButton>
      <ToggleButton value="b">Other</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

export const FocusVisibleSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="a">
      <ToggleButton value="a" selected className="Mui-focusVisible">Focused + Selected</ToggleButton>
      <ToggleButton value="b">Other</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

export const Disabled: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="a">
      <ToggleButton value="a" disabled>Disabled</ToggleButton>
      <ToggleButton value="b" disabled selected>Disabled + Selected</ToggleButton>
    </ToggleButtonGroup>
  ),
};

// ─── State combinations ───────────────────────────────────────────────────────

/** Hover + Focus on unselected */
export const HoverFocusUnselected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null}>
      <ToggleButton value="a" className="Mui-focusVisible">Option A</ToggleButton>
      <ToggleButton value="b">Option B</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

/** Hover + Focus on selected — most critical: green/teal ring + highlight must be clear */
export const HoverFocusSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="a">
      <ToggleButton value="a" selected className="Mui-focusVisible">Selected</ToggleButton>
      <ToggleButton value="b">Other</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

/** Active (pressing) on unselected */
export const ActiveUnselected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null}>
      <ToggleButton value="a">Option A</ToggleButton>
      <ToggleButton value="b">Option B</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { active: true } },
};

/** Active (pressing) on selected */
export const ActiveSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="a">
      <ToggleButton value="a" selected>Selected</ToggleButton>
      <ToggleButton value="b">Other</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { active: true } },
};

/** Active + Focus (keyboard activation) */
export const ActiveFocusUnselected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null}>
      <ToggleButton value="a" className="Mui-focusVisible">Option A</ToggleButton>
      <ToggleButton value="b">Option B</ToggleButton>
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { active: true, focusVisible: true } },
};

// ─── All states matrix ────────────────────────────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <Stack spacing={2}>
      {([
        { label: 'Default', selected: false, className: undefined, disabled: false },
        { label: 'Selected', selected: true, className: undefined, disabled: false },
        { label: 'Focus', selected: false, className: 'Mui-focusVisible', disabled: false },
        { label: 'Focus + Selected', selected: true, className: 'Mui-focusVisible', disabled: false },
        { label: 'Disabled', selected: false, className: undefined, disabled: true },
        { label: 'Disabled + Selected', selected: true, className: undefined, disabled: true },
      ]).map(({ label, selected, className, disabled }) => (
        <Stack key={label} direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
          <ToggleButtonGroup exclusive value={selected ? 'a' : null}>
            <ToggleButton value="a" selected={selected} className={className} disabled={disabled}>
              {label}
            </ToggleButton>
            <ToggleButton value="b" disabled={disabled}>Other</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      ))}
      <Typography variant="caption" color="text.secondary">
        * Hover shown in HoverUnselected and HoverSelected stories
      </Typography>
    </Stack>
  ),
};
