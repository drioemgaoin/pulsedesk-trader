import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, TextField } from '../../atoms';

const meta: Meta<typeof TextField> = {
  title: 'Atoms/TextField',
  component: TextField,
  tags: ['autodocs'],
  argTypes: {
    size:     { control: 'select', options: ['small', 'medium', 'large'] },
    label:    { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    error:    { control: 'boolean' },
    helperText: { control: 'text' },
  },
  args: { label: 'Label', placeholder: 'Placeholder…', size: 'medium', disabled: false, error: false },
};
export default meta;
type Story = StoryObj<typeof TextField>;

export const Playground: Story = {};

export const AllSizes: Story = {
  render: () => (
    <Stack spacing={3} sx={{ p: 3, maxWidth: 320 }}>
      <TextField label="Small"  size="small"  placeholder="Small input"  />
      <TextField label="Medium" size="medium" placeholder="Medium input" />
      <TextField label="Large"  size="large"  placeholder="Large input"  />
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack spacing={3} sx={{ p: 3, maxWidth: 320 }}>
      <TextField label="Default"  placeholder="Type something…" />
      <TextField label="With value" defaultValue="AAPL" />
      <TextField label="Error" error helperText="Symbol not found" defaultValue="???" />
      <TextField label="Disabled" disabled defaultValue="TSLA" />
    </Stack>
  ),
};
