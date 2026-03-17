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
    // themeMode is injected by the global withTheme decorator — hide it from
    // the controls panel so developers use the toolbar toggle instead.
    themeMode: { control: false, table: { disable: true } },
    username:       { control: 'text' },
    onToggleTheme:  { action: 'toggleTheme' },
    onLogout:       { action: 'logout' },
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
// themeMode is omitted — the global "Theme" toolbar injects it automatically.

export const Default: Story = {
  name: 'Terminal active',
  args: {
    navLinks: makeLinks('Terminal', () => {}),
    username: 'trader',
  },
};

// ─── No active link ───────────────────────────────────────────────────────────

export const NoActiveLink: Story = {
  name: 'No active link',
  args: {
    navLinks: makeLinks(null, () => {}),
    username: 'trader',
  },
};

// ─── Anonymous (no username) ──────────────────────────────────────────────────

export const Anonymous: Story = {
  name: 'Anonymous user (no username)',
  args: {
    navLinks: makeLinks('Terminal', () => {}),
    username: undefined,
  },
};

// ─── All links — active state showcase ───────────────────────────────────────
// Each row shows one link as active so you can review the active indicator at a
// glance. Reads themeMode from globals so the toggle icon is always correct.

export const AllLinksShowcase: Story = {
  name: 'All links — active state showcase',
  render: (_args, { globals }) => {
    const mode = globals?.['colorMode'] === 'light' ? 'light' : 'dark';
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {BASE_LINKS.map(({ label }) => (
          <NavBar
            key={label}
            navLinks={makeLinks(label, () => {})}
            username="trader"
            themeMode={mode}
            onToggleTheme={() => {}}
            onLogout={() => {}}
          />
        ))}
      </Box>
    );
  },
};

// ─── Interactive ─────────────────────────────────────────────────────────────
// Clicking theme-toggle or logout fires the console action.
// Initial mode is seeded from the toolbar; subsequent clicks update local state
// so the icon reflects the toggle independently of the global.

export const Interactive: Story = {
  name: 'Interactive — click to navigate',
  render: (_args, { globals }) => {
    const globalMode = globals?.['colorMode'] === 'light' ? 'light' : 'dark';
    const [active, setActive] = useState('Terminal');
    const [mode, setMode] = useState<'dark' | 'light'>(globalMode);
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
  },
};
