import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Stack, Typography } from '../../atoms';
import { FilterChip } from '../../molecules/FilterChip';
import type { OrderStatus } from '../../tokens';

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'FILLED', 'PARTIALLY_FILLED', 'REJECTED', 'CANCELLED'];

const meta: Meta = {
  title: 'Molecules/FilterChip',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Interactive: Story = {
  render: () => {
    const [active, setActive] = useState<OrderStatus[]>(['FILLED', 'PENDING']);
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary">Click to toggle</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {ALL_STATUSES.map(status => (
            <FilterChip
              key={status}
              status={status}
              isActive={active.includes(status)}
              onClick={() => setActive(prev =>
                prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
              )}
            />
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Active: {active.join(', ') || 'none'}
        </Typography>
      </Stack>
    );
  },
};
