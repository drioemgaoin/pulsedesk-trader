import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, Alert } from '../../atoms';

const meta: Meta<typeof Alert> = {
  title: 'Atoms/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    severity: { control: 'select', options: ['success', 'info', 'warning', 'error'] },
  },
  args: { severity: 'info', children: 'This is an alert message.' },
};
export default meta;
type Story = StoryObj<typeof Alert>;

export const Playground: Story = {};

export const AllSeverities: Story = {
  render: () => (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Alert severity="success">Order filled — 100 shares of AAPL at $195.20</Alert>
      <Alert severity="info">Market opens in 15 minutes</Alert>
      <Alert severity="warning">Stream reconnecting — prices may be stale</Alert>
      <Alert severity="error">Order rejected: insufficient margin</Alert>
    </Stack>
  ),
};
