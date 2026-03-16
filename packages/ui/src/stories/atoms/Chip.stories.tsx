import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, Chip } from '../../atoms';

const meta: Meta<typeof Chip> = {
  title: 'Atoms/Chip',
  component: Chip,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['filled', 'outlined'] },
    size:    { control: 'select', options: ['small', 'medium', 'large'] },
    color:   { control: 'select', options: ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'] },
    label:   { control: 'text' },
  },
  args: { label: 'Chip', variant: 'filled', size: 'medium', color: 'default' },
};
export default meta;
type Story = StoryObj<typeof Chip>;

export const Playground: Story = {};

export const AllSizes: Story = {
  render: () => (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}>
      <Chip label="Small"  size="small"  color="primary" />
      <Chip label="Medium" size="medium" color="primary" />
      <Chip label="Large"  size="large"  color="primary" />
    </Stack>
  ),
};

export const AllColors: Story = {
  render: () => (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {(['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'] as const).map(c => (
          <Chip key={c} label={c} color={c} variant="filled" />
        ))}
      </Stack>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {(['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'] as const).map(c => (
          <Chip key={c} label={c} color={c} variant="outlined" />
        ))}
      </Stack>
    </Stack>
  ),
};
