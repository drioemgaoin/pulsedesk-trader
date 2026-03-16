import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Stack, ToggleButtonGroup, Typography } from '../../atoms';
import { TradeSideButton } from '../../molecules/TradeSideButton';

const meta: Meta = {
  title: 'Molecules/TradeSideButton',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Interactive: Story = {
  render: () => {
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    return (
      <Stack spacing={3} sx={{ p: 3, maxWidth: 320 }}>
        <Typography variant="overline" color="text.secondary">BUY / SELL toggle</Typography>
        <ToggleButtonGroup
          value={side}
          exclusive
          fullWidth
          onChange={(_, v) => { if (v) setSide(v); }}
          sx={{ height: 48 }}
        >
          <TradeSideButton side="BUY" />
          <TradeSideButton side="SELL" />
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">Selected: {side}</Typography>
      </Stack>
    );
  },
};

export const BuySell: Story = {
  render: () => (
    <Stack direction="row" spacing={3} sx={{ p: 3 }}>
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">BUY — unselected</Typography>
        <ToggleButtonGroup value={null} exclusive sx={{ height: 40 }}>
          <TradeSideButton side="BUY" />
        </ToggleButtonGroup>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">BUY — selected</Typography>
        <ToggleButtonGroup value="BUY" exclusive sx={{ height: 40 }}>
          <TradeSideButton side="BUY" />
        </ToggleButtonGroup>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">SELL — unselected</Typography>
        <ToggleButtonGroup value={null} exclusive sx={{ height: 40 }}>
          <TradeSideButton side="SELL" />
        </ToggleButtonGroup>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">SELL — selected</Typography>
        <ToggleButtonGroup value="SELL" exclusive sx={{ height: 40 }}>
          <TradeSideButton side="SELL" />
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  ),
};
