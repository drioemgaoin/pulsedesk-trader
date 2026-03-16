import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { TradeSideButton, ToggleButtonGroup, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof TradeSideButton> = {
  title: 'Molecules/TradeSideButton',
  component: TradeSideButton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof TradeSideButton>;

// ─── Baseline ────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => {
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    return (
      <ToggleButtonGroup
        exclusive
        value={side}
        onChange={(_, v) => { if (v) setSide(v); }}
        sx={{ width: 240 }}
      >
        <TradeSideButton side="BUY" sx={{ flex: 1 }} />
        <TradeSideButton side="SELL" sx={{ flex: 1 }} />
      </ToggleButtonGroup>
    );
  },
};

// ─── Selected states ──────────────────────────────────────────────────────────

export const BuySelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="BUY" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} selected />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
};

export const SellSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="SELL" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} selected />
    </ToggleButtonGroup>
  ),
};

export const NoneSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
};

// ─── Hover states — CRITICAL: green/red must persist on hover ─────────────────

export const HoverUnselected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true } },
};

export const HoverBuySelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="BUY" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} selected />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true } },
};

export const HoverSellSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="SELL" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} selected />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true } },
};

// ─── Focus states ─────────────────────────────────────────────────────────────

export const FocusBuy: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} className="Mui-focusVisible" />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

export const FocusSell: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} className="Mui-focusVisible" />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

export const FocusBuySelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="BUY" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} selected className="Mui-focusVisible" />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { focusVisible: true } },
};

// ─── State combinations ───────────────────────────────────────────────────────

/** Hover + Focus — critical: green/red color must dominate the focus ring */
export const HoverFocusBuy: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} className="Mui-focusVisible" />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

export const HoverFocusSell: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} className="Mui-focusVisible" />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

/** Hover + Focus on selected — the densest combination */
export const HoverFocusBuySelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="BUY" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} selected className="Mui-focusVisible" />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

export const HoverFocusSellSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="SELL" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} selected className="Mui-focusVisible" />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { hover: true, focusVisible: true } },
};

/** Active (mouse pressed) on selected BUY/SELL */
export const ActiveBuySelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="BUY" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} selected />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { active: true } },
};

export const ActiveSellSelected: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value="SELL" sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} selected />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { active: true } },
};

/** Active + Focus (keyboard Enter/Space press) */
export const ActiveFocusBuy: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} className="Mui-focusVisible" />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { active: true, focusVisible: true } },
};

export const ActiveFocusSell: Story = {
  render: () => (
    <ToggleButtonGroup exclusive value={null} sx={{ width: 240 }}>
      <TradeSideButton side="BUY" sx={{ flex: 1 }} />
      <TradeSideButton side="SELL" sx={{ flex: 1 }} className="Mui-focusVisible" />
    </ToggleButtonGroup>
  ),
  parameters: { pseudo: { active: true, focusVisible: true } },
};

// ─── All states matrix ────────────────────────────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <Stack spacing={2}>
      {([
        { label: 'None selected', buySelected: false, sellSelected: false },
        { label: 'BUY selected', buySelected: true, sellSelected: false },
        { label: 'SELL selected', buySelected: false, sellSelected: true },
        { label: 'BUY focus', buySelected: false, sellSelected: false, buyClass: 'Mui-focusVisible' },
        { label: 'SELL focus', buySelected: false, sellSelected: false, sellClass: 'Mui-focusVisible' },
        { label: 'BUY selected + focus', buySelected: true, sellSelected: false, buyClass: 'Mui-focusVisible' },
        { label: 'SELL selected + focus', buySelected: false, sellSelected: true, sellClass: 'Mui-focusVisible' },
      ]).map(({ label, buySelected, sellSelected, buyClass, sellClass }: {
        label: string; buySelected: boolean; sellSelected: boolean; buyClass?: string; sellClass?: string;
      }) => (
        <Stack key={label} direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 200 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
          <ToggleButtonGroup
            exclusive
            value={buySelected ? 'BUY' : sellSelected ? 'SELL' : null}
            sx={{ width: 240 }}
          >
            <TradeSideButton side="BUY" sx={{ flex: 1 }} selected={buySelected} className={buyClass} />
            <TradeSideButton side="SELL" sx={{ flex: 1 }} selected={sellSelected} className={sellClass} />
          </ToggleButtonGroup>
        </Stack>
      ))}
      <Typography variant="caption" color="text.secondary">
        * Hover shown in HoverBuySelected and HoverSellSelected stories
      </Typography>
    </Stack>
  ),
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <Stack spacing={2}>
      {(['small', 'medium', 'large'] as const).map((size) => (
        <Stack key={size} direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 60 }}>
            <Typography variant="caption" color="text.secondary">{size}</Typography>
          </Box>
          <ToggleButtonGroup exclusive value="BUY" size={size} sx={{ width: 200 }}>
            <TradeSideButton side="BUY" sx={{ flex: 1 }} selected />
            <TradeSideButton side="SELL" sx={{ flex: 1 }} />
          </ToggleButtonGroup>
        </Stack>
      ))}
    </Stack>
  ),
};
