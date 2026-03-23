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
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## NavBar

The persistent top navigation bar that anchors every authenticated page. It contains the brand wordmark, primary navigation links, a live data status indicator, a dark/light mode toggle, and a logout button.

---

### Why this component exists

The trading terminal is a single-page application where users switch between the Terminal, Portfolio, Orders, and Simulator panels rapidly. NavBar is the constant — it stays mounted across all page transitions and provides the global affordances that every page needs: where am I, how do I navigate, is my data live, how do I sign out.

Encapsulating it as a single component ensures all of this is consistent regardless of which page is active.

---

### What NavBar contains

| Section | Content | Behaviour |
|---|---|---|
| Left | BrandWordmark | Static brand identity |
| Left | LiveBadge or PulsingChip | Real-time feed status |
| Center | Navigation links | Highlight the active page |
| Right | Theme toggle (IconButton) | Switches dark ↔ light mode |
| Right | Username | Read-only display of the logged-in user |
| Right | Logout (IconButton) | Fires \`onLogout\` callback |

---

### Props

- **navLinks** — array of \`{ label, icon, isActive, onClick }\` — one entry per top-level page
- **username** — logged-in user's display name (omit for anonymous/loading state)
- **themeMode** — \`'dark' | 'light'\` — controls the theme toggle icon appearance
- **onToggleTheme** — callback fired when the user clicks the theme toggle
- **onLogout** — callback fired when the user clicks the logout button

---

### Active link

Exactly one link should have \`isActive: true\` — the currently visible page. The active link receives a distinct visual treatment (filled indicator, higher contrast). If no link is active (e.g. during a page transition), pass \`isActive: false\` on all links.

---

### Feed status

NavBar is responsible for rendering either the \`LiveBadge\` (feed healthy) or a \`PulsingChip\` (feed degraded). The parent application updates the NavBar when the WebSocket connection state changes.

---

### Accessibility

Each navigation link renders as a \`<button>\` with descriptive text. The active link has \`aria-current="page"\`. The theme toggle and logout buttons are wrapped in \`Tooltip\` for accessible labels.

---

### Do / Don't

- ✅ Keep NavBar mounted for the entire authenticated session — do not unmount on page transitions.
- ✅ Mark exactly one link as active at a time.
- ❌ Do not add new controls to NavBar without design review — it is already at maximum density.
- ❌ Do not hide NavBar on any authenticated page — it is the only global navigation affordance.
        `,
      },
    },
  },
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
  render: (_args, { globals }) => {
    const mode = globals?.['colorMode'] === 'light' ? 'light' : 'dark';
    return (
      <NavBar
        navLinks={makeLinks('Terminal', () => {})}
        username="trader"
        themeMode={mode}
        onToggleTheme={() => {}}
        onLogout={() => {}}
      />
    );
  },
};

// ─── No active link ───────────────────────────────────────────────────────────

export const NoActiveLink: Story = {
  name: 'No active link',
  render: (_args, { globals }) => {
    const mode = globals?.['colorMode'] === 'light' ? 'light' : 'dark';
    return (
      <NavBar
        navLinks={makeLinks(null, () => {})}
        username="trader"
        themeMode={mode}
        onToggleTheme={() => {}}
        onLogout={() => {}}
      />
    );
  },
};

// ─── Anonymous (no username) ──────────────────────────────────────────────────

export const Anonymous: Story = {
  name: 'Anonymous user (no username)',
  render: (_args, { globals }) => {
    const mode = globals?.['colorMode'] === 'light' ? 'light' : 'dark';
    return (
      <NavBar
        navLinks={makeLinks('Terminal', () => {})}
        themeMode={mode}
        onToggleTheme={() => {}}
        onLogout={() => {}}
      />
    );
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
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
  render: (_args, { globals }) => {
    const mode = globals?.['colorMode'] === 'light' ? 'light' : 'dark';
    return (
      <NavBar
        navLinks={[
          ...makeLinks('Terminal', () => {}),
          { label: 'Simulator', icon: ScienceIcon, isActive: false, onClick: () => {} },
        ]}
        username="trader"
        themeMode={mode}
        onToggleTheme={() => {}}
        onLogout={() => {}}
      />
    );
  },
};
