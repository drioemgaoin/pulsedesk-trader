import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { StatCell } from '@pulsedesk/ui';
import { Box, Divider } from '@pulsedesk/ui';

const meta: Meta<typeof StatCell> = {
  title: 'Molecules/StatCell',
  component: StatCell,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof StatCell>;

export const Default: Story = {
  args: { label: 'Bid', value: '182.34', tooltip: 'Highest price a buyer is willing to pay' },
};

export const NoTooltip: Story = {
  args: { label: 'Volume', value: '1.2M' },
};

export const TickerGroup: Story = {
  name: 'Ticker strip group',
  render: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2, bgcolor: 'var(--pd-bg-canvas)' }}>
      <StatCell label="Bid"    value="182.34" tooltip="Highest buyer price"  />
      <StatCell label="Ask"    value="182.36" tooltip="Lowest seller price"  />
      <Divider orientation="vertical" flexItem />
      <StatCell label="Spread" value="0.02"   tooltip="Bid-ask spread"       />
      <StatCell label="Volume" value="4.8M"   tooltip="Shares traded today"  />
    </Box>
  ),
};
