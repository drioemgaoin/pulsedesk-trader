import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Skeleton, Stack, Box } from '@pulsedesk/ui';

const meta: Meta<typeof Skeleton> = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { width: 200, height: 28 },
};

export const LoadingTable: Story = {
  render: () => (
    <Stack spacing={1} sx={{ maxWidth: 480 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Stack key={i} direction="row" spacing={2}>
          <Skeleton width={80} />
          <Skeleton width={120} />
          <Skeleton width={60} />
          <Skeleton width={100} />
        </Stack>
      ))}
    </Stack>
  ),
};

export const Variants: Story = {
  render: () => (
    <Stack spacing={2}>
      <Skeleton variant="text" width={300} />
      <Skeleton variant="rectangular" width={300} height={60} />
      <Skeleton variant="rounded" width={300} height={60} />
      <Skeleton variant="circular" width={40} height={40} />
    </Stack>
  ),
};
