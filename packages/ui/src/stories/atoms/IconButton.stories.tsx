import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack, IconButton, Tooltip } from '../../atoms';
import { SearchIcon, DownloadIcon, FilterListIcon, DarkModeIcon, LightModeIcon } from '../../icons';

const meta: Meta<typeof IconButton> = {
  title: 'Atoms/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    size:     { control: 'select', options: ['small', 'medium', 'large'] },
    disabled: { control: 'boolean' },
  },
  args: { size: 'medium', disabled: false },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const AllSizes: Story = {
  render: () => (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}>
      {(['small', 'medium', 'large'] as const).map(size => (
        <Tooltip key={size} title={`size="${size}"`}>
          <IconButton size={size}><SearchIcon /></IconButton>
        </Tooltip>
      ))}
    </Stack>
  ),
};

export const CommonIcons: Story = {
  render: () => (
    <Stack direction="row" spacing={1} sx={{ p: 3 }}>
      <Tooltip title="Search"><IconButton><SearchIcon /></IconButton></Tooltip>
      <Tooltip title="Download"><IconButton><DownloadIcon /></IconButton></Tooltip>
      <Tooltip title="Filter"><IconButton><FilterListIcon /></IconButton></Tooltip>
      <Tooltip title="Dark mode"><IconButton><DarkModeIcon /></IconButton></Tooltip>
      <Tooltip title="Light mode"><IconButton><LightModeIcon /></IconButton></Tooltip>
    </Stack>
  ),
};
