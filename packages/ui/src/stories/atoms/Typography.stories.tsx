import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, Typography, Divider } from '../../atoms';

const meta: Meta<typeof Typography> = {
  title: 'Atoms/Typography',
  component: Typography,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Typography>;

export const TypeScale: Story = {
  render: () => (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Typography variant="h4">h4 — Page heading</Typography>
      <Typography variant="h5">h5 — Section heading</Typography>
      <Typography variant="h6">h6 — Card heading</Typography>
      <Divider />
      <Typography variant="subtitle1">subtitle1 — Panel title</Typography>
      <Typography variant="subtitle2">subtitle2 — Secondary panel title</Typography>
      <Divider />
      <Typography variant="body1">body1 — Primary body text used in tables and lists</Typography>
      <Typography variant="body2">body2 — Secondary body text, smaller captions</Typography>
      <Divider />
      <Typography variant="caption">CAPTION — Labels, 11px uppercase tracking</Typography>
      <Typography variant="overline">OVERLINE — Column headers, 11px uppercase tracking</Typography>
    </Stack>
  ),
};

export const ColorVariants: Story = {
  render: () => (
    <Stack spacing={1} sx={{ p: 3 }}>
      <Typography color="text.primary">text.primary — Main content</Typography>
      <Typography color="text.secondary">text.secondary — Supporting content</Typography>
      <Typography color="text.disabled">text.disabled — Disabled state</Typography>
      <Typography color="trading.uptick">trading.uptick — Gains / BUY</Typography>
      <Typography color="trading.downtick">trading.downtick — Losses / SELL</Typography>
      <Typography color="trading.pending">trading.pending — Pending orders</Typography>
    </Stack>
  ),
};
