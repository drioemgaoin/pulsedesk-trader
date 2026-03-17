import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import {
  NavBar,
  type NavBarLink,
  Box,
  ShowChartIcon,
  AccountBalanceWalletIcon,
  ReceiptLongIcon,
  ScienceIcon,
} from '@pulsedesk/ui';

const meta: Meta<typeof NavBar> = {
  title: 'Organisms/NavBar',
  component: NavBar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    themeMode: { control: 'radio', options: ['dark', 'light'] },
    username: { control: 'text' },
    onToggleTheme: { action: 'toggleTheme' },
    onLogout: { action: 'logout' },
  },
};
export default meta;
type Story = StoryObj<typeof NavBar>;

// ─── Shared fixture data ──────────────────────────────────────────────────────

const BASE_LINKS: Omit<NavBarLink, 'isActive' | 'onClick'>[] = [
  { label: 'Terminal',  icon: ShowChartIcon },
  { label: 'Portfolio', icon: AccountBalanceWalletIcon },
  { label: 'Orders',    icon: ReceiptLongIcon },
];

function makeLinks(
  activeLabel: string | null,
  onNavigate: (label: string) => void,
): NavBarLink[] {
  return BASE_LINKS.map(({ label, icon }) => ({
    label,
    icon,
    isActive: label === activeLabel,
    onClick: () => onNavigate(label),
  }));
}

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Dark mode — Terminal active',
  args: {
    navLinks: makeLinks('Terminal', () => {}),
    username: 'trader',
    themeMode: 'dark',
  },
};

// ─── Light mode ───────────────────────────────────────────────────────────────

export const LightMode: Story = {
  name: 'Light mode — Orders active',
  args: {
    navLinks: makeLinks('Orders', () => {}),
    username: 'trader',
    themeMode: 'light',
  },
};

// ─── No active link ───────────────────────────────────────────────────────────

export const NoActiveLink: Story = {
  name: 'No active link',
  args: {
    navLinks: makeLinks(null, () => {}),
    username: 'trader',
    themeMode: 'dark',
  },
};

// ─── Anonymous (no username) ──────────────────────────────────────────────────

export const Anonymous: Story = {
  name: 'Anonymous user (no username)',
  args: {
    navLinks: makeLinks('Terminal', () => {}),
    username: undefined,
    themeMode: 'dark',
  },
};

// ─── All links active (one at a time showcase) ────────────────────────────────

export const AllLinksShowcase: Story = {
  name: 'All links — active state showcase',
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {BASE_LINKS.map(({ label }) => (
        <NavBar
          key={label}
          navLinks={makeLinks(label, () => {})}
          username="trader"
          themeMode="dark"
          onToggleTheme={() => {}}
          onLogout={() => {}}
        />
      ))}
    </Box>
  ),
};

// ─── Interactive ─────────────────────────────────────────────────────────────

export const Interactive: Story = {
  name: 'Interactive — click to navigate',
  render: () => {
    const [active, setActive] = useState('Terminal');
    const [mode, setMode] = useState<'dark' | 'light'>('dark');
    return (
      <NavBar
        navLinks={makeLinks(active, setActive)}
        username="trader"
        themeMode={mode}
        onToggleTheme={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
        onLogout={() => alert('Logged out')}
      />
    );
  },
};

// ─── Extended links (with Simulator) ─────────────────────────────────────────

export const ExtendedLinks: Story = {
  name: 'Extended links (4 items)',
  args: {
    navLinks: [
      ...makeLinks('Terminal', () => {}),
      { label: 'Simulator', icon: ScienceIcon, isActive: false, onClick: () => {} },
    ],
    username: 'trader',
    themeMode: 'dark',
  },
};
