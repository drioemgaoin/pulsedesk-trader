import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { StatusChip, Stack, Box, Typography } from '@pulsedesk/ui';
import type { OrderStatus } from '@pulsedesk/ui';

const meta: Meta<typeof StatusChip> = {
  title: 'Molecules/StatusChip',
  component: StatusChip,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof StatusChip>;

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'FILLED',
  'PARTIALLY_FILLED',
  'REJECTED',
  'CANCELLED',
];

export const Default: Story = {
  args: { status: 'FILLED' },
};

export const AllStatuses: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <StatusChip key={status} status={status} />
      ))}
    </Stack>
  ),
};

/** StatusChip is a display-only badge — not interactive. Shown in table rows. */
export const InContext: Story = {
  render: () => (
    <Stack spacing={1} sx={{ maxWidth: 500 }}>
      {ALL_STATUSES.map((status) => (
        <Stack key={status} direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 160 }}>
            <Typography variant="body2" color="text.secondary">{status}</Typography>
          </Box>
          <StatusChip status={status} />
        </Stack>
      ))}
    </Stack>
  ),
};
