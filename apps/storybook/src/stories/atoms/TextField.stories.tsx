import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TextField, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof TextField> = {
  title: 'Atoms/TextField',
  component: TextField,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof TextField>;

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { label: 'Label', placeholder: 'Placeholder' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 320 }}>
      <TextField label="Outlined (default)" variant="outlined" />
      <TextField label="Filled" variant="filled" />
      <TextField label="Standard" variant="standard" />
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 320 }}>
      <TextField label="Small" size="small" />
      <TextField label="Medium" size="medium" />
    </Stack>
  ),
};

// ─── Individual states ────────────────────────────────────────────────────────

/** MUI TextField focused state: uses `focused` prop + focusWithin pseudo-state on the wrapper */
export const Focused: Story = {
  args: { label: 'Focused', focused: true },
  parameters: { pseudo: { focusWithin: true, focusVisible: true } },
};

export const Hover: Story = {
  args: { label: 'Hover' },
  parameters: { pseudo: { hover: true } },
};

export const Error: Story = {
  args: { label: 'Error', error: true, helperText: 'This field is required' },
};

export const Disabled: Story = {
  args: { label: 'Disabled', disabled: true, defaultValue: "Can't edit this" },
};

export const WithHelperText: Story = {
  args: { label: 'With helper text', helperText: 'Enter your value above' },
};

// ─── State combinations ───────────────────────────────────────────────────────

/** Hover while the field is focused (mouse over an active input) */
export const HoverFocused: Story = {
  args: { label: 'Hover + Focused', focused: true, sx: { width: 280 } },
  parameters: { pseudo: { hover: true, focusWithin: true } },
};

/** Hover on an error field */
export const HoverError: Story = {
  args: { label: 'Hover + Error', error: true, helperText: 'Required', sx: { width: 280 } },
  parameters: { pseudo: { hover: true } },
};

// ─── All states matrix ────────────────────────────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 420 }}>
      {([
        { label: 'Default', props: {} },
        { label: 'Focused', props: { focused: true } },
        { label: 'Error', props: { error: true, helperText: 'Required' } },
        { label: 'Disabled', props: { disabled: true, defaultValue: 'Locked' } },
      ] as const).map(({ label, props }) => (
        <Box key={label}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{label}</Typography>
          <TextField label={label} {...(props as object)} fullWidth />
        </Box>
      ))}
      <Typography variant="caption" color="text.secondary">
        * Hover state shown in dedicated story
      </Typography>
    </Stack>
  ),
};

export const HoverAllVariants: Story = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 320 }}>
      <TextField label="Outlined hover" variant="outlined" />
      <TextField label="Filled hover" variant="filled" />
    </Stack>
  ),
  parameters: { pseudo: { hover: true } },
};

export const PasswordField: Story = {
  args: { label: 'Password', type: 'password', placeholder: '••••••••' },
};
