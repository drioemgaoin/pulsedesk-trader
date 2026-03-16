import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Typography, Stack, Box } from '@pulsedesk/ui';

const meta: Meta<typeof Typography> = {
  title: 'Atoms/Typography',
  component: Typography,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Typography>;

export const Default: Story = {
  args: { children: 'The quick brown fox jumps over the lazy dog.' },
};

export const TypeScale: Story = {
  render: () => (
    <Stack spacing={1}>
      {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'overline'] as const).map(
        (variant) => (
          <Typography key={variant} variant={variant}>
            {variant} — The quick brown fox
          </Typography>
        ),
      )}
    </Stack>
  ),
};

export const Colors: Story = {
  render: () => (
    <Stack spacing={1}>
      <Typography color="text.primary">text.primary</Typography>
      <Typography color="text.secondary">text.secondary</Typography>
      <Typography color="text.disabled">text.disabled</Typography>
      <Typography color="primary.main">primary.main</Typography>
      <Typography color="success.main">success.main (uptick)</Typography>
      <Typography color="error.main">error.main (downtick)</Typography>
    </Stack>
  ),
};

export const Monospace: Story = {
  render: () => (
    <Box>
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
        ord-00000001-0001-0001 · 178.32 · BUY × 100
      </Typography>
    </Box>
  ),
};
