import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, Badge, IconButton } from '../../atoms';
import { FilterListIcon } from '../../icons';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { badgeContent: 4, color: 'warning' },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Playground: Story = {
  render: (args) => (
    <Stack sx={{ p: 3 }}>
      <Badge {...args}>
        <IconButton><FilterListIcon /></IconButton>
      </Badge>
    </Stack>
  ),
};

export const Colors: Story = {
  render: () => (
    <Stack direction="row" spacing={4} sx={{ p: 3 }}>
      {(['warning', 'error', 'success', 'primary', 'info'] as const).map(color => (
        <Badge key={color} badgeContent={color === 'primary' ? 12 : 3} color={color}>
          <IconButton><FilterListIcon /></IconButton>
        </Badge>
      ))}
    </Stack>
  ),
};
