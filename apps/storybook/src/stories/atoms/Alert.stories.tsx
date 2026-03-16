import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Alert, Stack } from '@pulsedesk/ui';

const meta: Meta<typeof Alert> = {
  title: 'Atoms/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  args: { severity: 'info', children: 'This is an info alert.' },
};

export const AllSeverities: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <Alert severity="success">This is a success alert — check it out!</Alert>
      <Alert severity="info">This is an info alert — check it out!</Alert>
      <Alert severity="warning">This is a warning alert — check it out!</Alert>
      <Alert severity="error">This is an error alert — check it out!</Alert>
    </Stack>
  ),
};

export const WithTitle: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <Alert severity="error">
        Login failed: Invalid credentials. Please try again.
      </Alert>
      <Alert severity="warning">
        Your session expired. Please sign in again.
      </Alert>
    </Stack>
  ),
};
