import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { StatCell } from '@pulsedesk/ui';
import { Box, Divider } from '@pulsedesk/ui';

const meta: Meta<typeof StatCell> = {
  title: 'Molecules/StatCell',
  component: StatCell,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
## StatCell

A compact label-above-value display unit used in the ticker strip at the top of the trading terminal. Each StatCell shows one market statistic — Bid, Ask, Spread, Volume, Last Price — with a small label above and a prominent value below.

---

### Why this component exists

The ticker strip is a horizontal row of market data that needs to communicate several values simultaneously in a confined space. StatCell defines a single "slot" in that strip — the label/value pairing — and handles the typography, spacing, and optional tooltip consistently across all statistics.

Using StatCell keeps the ticker strip uniform: all labels are the same size, all values use the same monospace font, and all tooltips follow the same interaction pattern. Without this component, each statistic would need its own layout decisions, leading to inconsistency across the strip.

---

### Props

- **label** — short uppercase label (e.g. "Bid", "Ask", "Vol") displayed in small muted text above the value
- **value** — the formatted value string (e.g. "182.34", "4.8M") — pre-formatted by the caller
- **tooltip** — optional explanation shown on hover (e.g. "Highest price a buyer is willing to pay")

---

### Typography

- Label: \`caption\` variant, \`text.secondary\` color — deliberately muted so the value dominates
- Value: \`body2\` monospace — consistent width ensures values align and don't shift as prices update

---

### Placement

StatCell is only used inside the ticker strip, rendered in a horizontal flex row with \`gap: 3\` and dividers between groups (e.g. Bid/Ask as one group, Spread/Volume as another).

---

### Do / Don't

- ✅ Pre-format the value string — StatCell does not format numbers itself.
- ✅ Add \`tooltip\` for any non-obvious statistic (Spread, VWAP, implied volatility).
- ❌ Do not use StatCell outside the ticker strip — it is not a general key-value display.
- ❌ Do not use StatCell for P&L values — use PnlValue for color-coded profit/loss display.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof StatCell>;

export const Default: Story = {
  render: () => (
    <StatCell label="Bid" value="182.34" tooltip="Highest price a buyer is willing to pay" />
  ),
};

export const NoTooltip: Story = {
  render: () => <StatCell label="Volume" value="1.2M" />,
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
