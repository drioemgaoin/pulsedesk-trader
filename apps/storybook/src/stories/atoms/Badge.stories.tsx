import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Badge, IconButton, Stack } from '@pulsedesk/ui';
import { FilterListIcon, DownloadIcon } from '@pulsedesk/ui';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  render: () => (
    <Badge badgeContent={4} color="primary">
      <FilterListIcon />
    </Badge>
  ),
};

export const Colors: Story = {
  render: () => (
    <Stack direction="row" spacing={3}>
      {(['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const).map((color) => (
        <Badge key={color} badgeContent={3} color={color}>
          <DownloadIcon />
        </Badge>
      ))}
    </Stack>
  ),
};

export const WithIconButton: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <IconButton>
        <Badge badgeContent={0} color="primary">
          <FilterListIcon />
        </Badge>
      </IconButton>
      <IconButton color="primary">
        <Badge badgeContent={2} color="primary">
          <FilterListIcon />
        </Badge>
      </IconButton>
    </Stack>
  ),
};
