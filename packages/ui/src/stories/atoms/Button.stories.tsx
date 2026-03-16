import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, Button } from '../../atoms';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant:  { control: 'select', options: ['contained', 'outlined', 'text'] },
    size:     { control: 'select', options: ['small', 'medium', 'large'] },
    color:    { control: 'select', options: ['primary', 'secondary', 'success', 'error', 'warning'] },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: { children: 'Button', variant: 'contained', size: 'medium', color: 'primary', disabled: false },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={3} sx={{ p: 3 }}>
      {(['small', 'medium', 'large'] as const).map(size => (
        <Stack key={size} direction="row" spacing={2} alignItems="center">
          <Button variant="contained" size={size} color="primary">{size} Primary</Button>
          <Button variant="outlined"  size={size} color="primary">{size} Secondary</Button>
          <Button variant="text"      size={size} color="primary">{size} Tertiary</Button>
        </Stack>
      ))}
    </Stack>
  ),
};

export const SemanticColors: Story = {
  render: () => (
    <Stack direction="row" spacing={2} sx={{ p: 3 }}>
      <Button variant="contained" color="success">Buy</Button>
      <Button variant="contained" color="error">Sell</Button>
      <Button variant="contained" color="warning">Pending</Button>
      <Button variant="contained" color="secondary">Secondary</Button>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Stack direction="row" spacing={2}>
        <Button variant="contained">Default</Button>
        <Button variant="contained" disabled>Disabled</Button>
      </Stack>
      <Stack direction="row" spacing={2}>
        <Button variant="outlined">Default</Button>
        <Button variant="outlined" disabled>Disabled</Button>
      </Stack>
      <Stack direction="row" spacing={2}>
        <Button variant="text">Default</Button>
        <Button variant="text" disabled>Disabled</Button>
      </Stack>
    </Stack>
  ),
};
