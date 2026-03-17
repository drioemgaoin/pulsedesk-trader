import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PulsingChip } from '@pulsedesk/ui';
import { Stack } from '@pulsedesk/ui';

const meta: Meta<typeof PulsingChip> = {
  title: 'Atoms/PulsingChip',
  component: PulsingChip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    color: { control: 'radio', options: ['warning', 'error', 'success', 'info'] },
    durationMs: { control: { type: 'range', min: 500, max: 3000, step: 100 } },
  },
};
export default meta;
type Story = StoryObj<typeof PulsingChip>;

export const Reconnecting: Story = {
  args: { label: 'RECONNECTING', color: 'warning' },
};

export const Stale: Story = {
  args: { label: 'STALE', color: 'warning' },
};

export const AllColors: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <PulsingChip label="WARNING" color="warning" />
      <PulsingChip label="ERROR"   color="error"   />
      <PulsingChip label="SUCCESS" color="success"  />
      <PulsingChip label="INFO"    color="info"     />
    </Stack>
  ),
};
