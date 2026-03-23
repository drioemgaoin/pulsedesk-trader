import type { Meta, StoryObj } from '@storybook/react';
import { LiveBadge } from '@pulsedesk/ui';

const meta: Meta<typeof LiveBadge> = {
  title: 'Atoms/LiveBadge',
  component: LiveBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
## LiveBadge

A small animated indicator that signals real-time data is actively streaming. It pairs with the NavBar and panel headers to communicate that the platform is connected and prices are live.

---

### Why this component exists

In a trading terminal, the difference between live and stale data can mean the difference between a good trade and a bad one. LiveBadge answers the question "am I actually connected right now?" at a glance, without requiring the user to open a status panel.

The pulsing animation is deliberately subtle — it should reassure without distracting. If the feed drops, the badge is replaced by a \`PulsingChip\` with a warning state.

---

### Behaviour

- Renders a green pulsing dot with the text **LIVE**.
- The pulse animation runs indefinitely while the component is mounted.
- It has no props — its presence or absence is the signal. Mount it when connected, unmount (or replace with PulsingChip) when not.

---

### Placement

LiveBadge belongs in the NavBar, adjacent to the brand wordmark. It is not intended for use inside panels or tables.

---

### LiveBadge vs PulsingChip

| Component | When to use |
|---|---|
| **LiveBadge** | Connected and streaming — positive state |
| **PulsingChip** | Degraded state: reconnecting, stale, error |

---

### Do / Don't

- ✅ Show LiveBadge only when the WebSocket feed is confirmed active.
- ✅ Replace with PulsingChip (warning) during reconnection attempts.
- ❌ Do not use LiveBadge as a generic "online" indicator outside the trading context.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof LiveBadge>;

export const Default: Story = {};

export const WithBackground: Story = {
  render: () => (
    <div style={{ background: 'var(--pd-bg-canvas)', padding: '8px 12px', borderRadius: 4 }}>
      <LiveBadge />
    </div>
  ),
};
