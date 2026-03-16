import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SearchField, Stack } from '@pulsedesk/ui';

const meta: Meta<typeof SearchField> = {
  title: 'Molecules/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof SearchField>;

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { placeholder: 'Search symbols…', sx: { width: 280 } },
};

export const Sizes: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 320 }}>
      <SearchField size="small" placeholder="Small field…" />
      <SearchField size="medium" placeholder="Medium field…" />
    </Stack>
  ),
};

export const WithValue: Story = {
  args: {
    value: 'AAPL',
    sx: { width: 280 },
  },
};

// ─── Interactive states ───────────────────────────────────────────────────────

export const Hover: Story = {
  args: { placeholder: 'Search symbols…', sx: { width: 280 } },
  parameters: { pseudo: { hover: true } },
};

export const Focused: Story = {
  args: { placeholder: 'Search symbols…', sx: { width: 280 }, focused: true },
  parameters: { pseudo: { focusWithin: true, focusVisible: true } },
};

export const Disabled: Story = {
  args: { placeholder: 'Search symbols…', sx: { width: 280 }, disabled: true },
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocused: Story = {
  args: { placeholder: 'Search symbols…', sx: { width: 280 }, focused: true },
  parameters: { pseudo: { hover: true, focusWithin: true } },
};

// ─── All states ───────────────────────────────────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 320 }}>
      <SearchField placeholder="Default" />
      <SearchField placeholder="Focused" focused />
      <SearchField placeholder="Disabled" disabled />
      <SearchField value="With value" />
    </Stack>
  ),
};
