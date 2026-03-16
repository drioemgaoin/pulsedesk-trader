import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Stack, ToggleButtonGroup, ToggleButton, Typography } from '../../atoms';

const meta: Meta = {
  title: 'Atoms/ToggleButton',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

function ControlledGroup({ size }: { size: 'small' | 'medium' | 'large' }) {
  const [value, setValue] = useState('MARKET');
  return (
    <ToggleButtonGroup value={value} exclusive onChange={(_, v) => { if (v) setValue(v); }} size={size}>
      <ToggleButton value="MARKET">Market</ToggleButton>
      <ToggleButton value="LIMIT">Limit</ToggleButton>
      <ToggleButton value="STOP">Stop</ToggleButton>
    </ToggleButtonGroup>
  );
}

export const AllSizes: Story = {
  render: () => (
    <Stack spacing={3} sx={{ p: 3 }}>
      {(['small', 'medium', 'large'] as const).map(size => (
        <Stack key={size} spacing={1}>
          <Typography variant="caption" color="text.secondary">{size}</Typography>
          <ControlledGroup size={size} />
        </Stack>
      ))}
    </Stack>
  ),
};
