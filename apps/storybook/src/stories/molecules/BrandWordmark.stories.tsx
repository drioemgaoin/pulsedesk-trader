import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { BrandWordmark } from '@pulsedesk/ui';
import { Box, Stack, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof BrandWordmark> = {
  title: 'Molecules/BrandWordmark',
  component: BrandWordmark,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
  },
};
export default meta;
type Story = StoryObj<typeof BrandWordmark>;

export const Small: Story = {
  name: 'sm — nav bar size',
  args: { size: 'sm' },
};

export const Large: Story = {
  name: 'lg — login page size',
  args: { size: 'lg' },
};

export const BothSizes: Story = {
  name: 'Both sizes compared',
  render: () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>sm — nav bar</Typography>
        <BrandWordmark size="sm" />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>lg — login / hero</Typography>
        <BrandWordmark size="lg" />
      </Box>
    </Stack>
  ),
};
