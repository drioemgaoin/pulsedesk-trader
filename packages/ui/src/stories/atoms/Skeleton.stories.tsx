import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, Skeleton } from '../../atoms';

const meta: Meta<typeof Skeleton> = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const TableRows: Story = {
  render: () => (
    <Stack spacing={1} sx={{ p: 3 }}>
      {[80, 60, 75, 50, 90].map((w, i) => (
        <Skeleton key={i} height={20} width={`${w}%`} />
      ))}
    </Stack>
  ),
};
