import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, Typography } from '../../atoms';
import { StatusChip } from '../../molecules/StatusChip';
import type { OrderStatus } from '../../tokens';

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'FILLED', 'PARTIALLY_FILLED', 'REJECTED', 'CANCELLED'];

const meta: Meta<typeof StatusChip> = {
  title: 'Molecules/StatusChip',
  component: StatusChip,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'select', options: ALL_STATUSES },
  },
  args: { status: 'FILLED' },
};
export default meta;
type Story = StoryObj<typeof StatusChip>;

export const Playground: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Typography variant="overline" color="text.secondary">All order statuses</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {ALL_STATUSES.map(status => (
          <StatusChip key={status} status={status} />
        ))}
      </Stack>
    </Stack>
  ),
};
