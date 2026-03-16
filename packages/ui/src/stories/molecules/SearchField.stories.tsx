import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack } from '../../atoms';
import { SearchField } from '../../molecules/SearchField';

const meta: Meta<typeof SearchField> = {
  title: 'Molecules/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  argTypes: {
    size:        { control: 'select', options: ['small', 'medium', 'large'] },
    placeholder: { control: 'text' },
    disabled:    { control: 'boolean' },
  },
  args: { placeholder: 'Search symbols…', size: 'medium', disabled: false },
};
export default meta;
type Story = StoryObj<typeof SearchField>;

export const Playground: Story = {};

export const AllSizes: Story = {
  render: () => (
    <Stack spacing={3} sx={{ p: 3, maxWidth: 360 }}>
      <SearchField size="small"  placeholder="Small search"  />
      <SearchField size="medium" placeholder="Medium search" />
      <SearchField size="large"  placeholder="Large search"  />
    </Stack>
  ),
};
