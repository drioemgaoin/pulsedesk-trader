import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PulsingChip, Stack, Box, Typography } from '@pulsedesk/ui';
import { PulsingColorRow, PULSING_CHIP_COLORS } from './_chip-story-helpers';

const meta: Meta<typeof PulsingChip> = {
  title: 'Atoms/PulsingChip',
  component: PulsingChip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## PulsingChip

An animated status chip that pulses repeatedly to draw attention to a degraded or transient system state. Used in the NavBar when the real-time feed is not fully operational.

---

### Why this component exists

When market data is stale or the WebSocket is reconnecting, users must know immediately — acting on old prices has direct financial consequences. A static chip can be overlooked. PulsingChip's repeating animation keeps the state visible at the periphery of attention without requiring a disruptive modal or alert.

---

### PulsingChip vs Chip

PulsingChip is a specialised Chip with three constraints that are fixed by design:

| Property | Chip | PulsingChip |
|---|---|---|
| \`label\` | **Required** | **Required** — a pulsing chip without text has no accessible meaning |
| Variant | filled / outlined | Always filled — the animation only reads correctly on a filled chip |
| Size | small / medium / large | Always small — a large animated chip is visually disruptive |
| Colors | 7 (all semantic) | 4 (warning / error / success / info) — only connection-state semantics apply |
| Interaction | Static or interactive | Always static — it is a status indicator, not a control |

---

### When to use

| State | Label | Color |
|---|---|---|
| Feed reconnecting (transient) | RECONNECTING | warning |
| Feed confirmed stale (prolonged) | STALE | warning |
| Feed error / failed | ERROR | error |
| Feed restored (brief confirmation) | LIVE | success |
| Informational delay notice | custom | info |

---

### Props

- **label** — text displayed inside the chip (**required**, all caps recommended for status labels)
- **color** — semantic color: \`warning\`, \`error\`, \`success\`, \`info\`
- **durationMs** — pulse cycle duration in milliseconds (default: 1500ms). Increase for less urgent states, decrease for critical ones.

---

### PulsingChip vs LiveBadge

| Component | When to use |
|---|---|
| **LiveBadge** | Positive connected state — steady green dot |
| **PulsingChip** | Degraded state — animated colored chip demanding attention |

---

### Accessibility

The chip text is the accessible label. Screen readers will announce it when the component is first rendered. For repeated state changes (e.g. reconnecting → live), ensure the component is unmounted and remounted so the announcement fires again.

---

### Do / Don't

- ✅ Always provide a \`label\` — a pulsing chip without text is not accessible.
- ✅ Use warning color during reconnection — it is transient and amber is appropriate.
- ✅ Use error color only when the feed has definitively failed and manual action is needed.
- ❌ Do not use PulsingChip for non-connection status (order fills, positions) — use StatusChip instead.
- ❌ Do not set \`durationMs\` too low (below 500ms) — rapid flashing is an accessibility hazard.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof PulsingChip>;

// ─── Colors ───────────────────────────────────────────────────────────────────
// All 4 supported colors. Layout kept in sync with Chip via PulsingColorRow.

export const Colors: Story = {
  render: () => <PulsingColorRow />,
};

// ─── Animation speed ──────────────────────────────────────────────────────────
// Shows the effect of durationMs: fast (critical) → default → slow (ambient).

export const AnimationSpeed: Story = {
  render: () => (
    <Stack spacing={2}>
      {([
        { label: 'fast — 800ms',    durationMs: 800  },
        { label: 'default — 1500ms', durationMs: 1500 },
        { label: 'slow — 3000ms',   durationMs: 3000 },
      ] as const).map(({ label, durationMs }) => (
        <Stack key={label} direction="row" alignItems="center" spacing={2}>
          <Box sx={{ width: 140, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
          <PulsingColorRow durationMs={durationMs} />
        </Stack>
      ))}
    </Stack>
  ),
};

// ─── Domain states ────────────────────────────────────────────────────────────
// Named stories for each real-world connection state.
// These differ from Chip — they document intent, not visual variants.

export const Reconnecting: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <PulsingChip label="RECONNECTING" color="warning" />
      <PulsingChip label="RECONNECTING" color="warning" durationMs={800} />
    </Stack>
  ),
};

export const Stale: Story = {
  render: () => <PulsingChip label="STALE" color="warning" />,
};

export const FeedError: Story = {
  name: 'Feed error',
  render: () => <PulsingChip label="ERROR" color="error" durationMs={800} />,
};

export const Live: Story = {
  render: () => <PulsingChip label="LIVE" color="success" />,
};
