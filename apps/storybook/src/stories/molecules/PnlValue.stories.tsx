import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PnlValue } from '@pulsedesk/ui';
import { Stack, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof PnlValue> = {
  title: 'Molecules/PnlValue',
  component: PnlValue,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['caption', 'body2', 'body1', 'subtitle2', 'subtitle1', 'h6'] },
  },
};
export default meta;
type Story = StoryObj<typeof PnlValue>;

export const Positive: Story = {
  args: { value: 1234.56, pct: 2.3 },
};

export const Negative: Story = {
  args: { value: -500, pct: -1.1 },
};

export const ZeroPnl: Story = {
  name: 'Zero P&L',
  args: { value: 0, pct: 0 },
};

export const AllVariants: Story = {
  name: 'Typography variants',
  render: () => (
    <Stack spacing={1.5}>
      {(['caption', 'body2', 'body1', 'subtitle2', 'subtitle1', 'h6'] as const).map((v) => (
        <Stack key={v} direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ width: 72, flexShrink: 0 }}>{v}</Typography>
          <PnlValue value={1234.56} pct={2.3} variant={v} />
        </Stack>
      ))}
    </Stack>
  ),
};
