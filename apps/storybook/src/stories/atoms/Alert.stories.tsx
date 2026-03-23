import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Alert, Stack } from '@pulsedesk/ui';

const meta: Meta<typeof Alert> = {
  title: 'Atoms/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Alert

A prominent, full-width banner that communicates a system-level message requiring the user's attention. Alerts interrupt the flow deliberately — use them only when the user genuinely needs to act or be warned.

---

### Why this component exists

Trading platforms generate a constant stream of state changes — connection drops, order rejections, session timeouts, and confirmations. Alerts surface the critical ones so users do not miss them while focused on price action or form entry. Inline text or a toast is insufficient when the consequence of missing a message is a failed trade or a security issue.

---

### Severity — semantic meaning

| Severity | Color | When to use |
|---|---|---|
| **success** | Green | Positive confirmation: order filled, settings saved, action completed |
| **info** | Blue | Neutral system notice: feature update, informational message, status change |
| **warning** | Amber | Caution required: session about to expire, risk threshold approaching |
| **error** | Red | Something failed or is blocked: login failed, order rejected, connection lost |

---

### Placement

Alerts belong at the **top of a panel or page**, above all other content. They should not be buried inside a form or hidden below the fold.

---

### Accessibility

Alerts render with \`role="alert"\` by default which causes screen readers to announce the message immediately. Use this only for messages the user must hear right now. For informational notices that can wait, consider a snackbar or a static inline note.

---

### Do / Don't

- ✅ Use the correct severity — color communicates urgency.
- ✅ Keep alert text concise and actionable.
- ❌ Do not use Alerts for decorative callouts or marketing copy.
- ❌ Do not stack multiple Alerts at once — if many things are wrong, summarise in one message.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Alert>;

// ─── Shared constants ─────────────────────────────────────────────────────────

const SEVERITIES = ['success', 'info', 'warning', 'error'] as const;

// ─── SeverityStack ────────────────────────────────────────────────────────────
// Renders all 4 severities in a column for a given set of alert props.

function SeverityStack({ messages }: {
  messages: Record<typeof SEVERITIES[number], string>;
}) {
  return (
    <Stack spacing={2} sx={{ maxWidth: 520 }}>
      {SEVERITIES.map((severity) => (
        <Alert key={severity} severity={severity}>{messages[severity]}</Alert>
      ))}
    </Stack>
  );
}

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <SeverityStack messages={{
      success: 'This is a success alert.',
      info:    'This is an info alert.',
      warning: 'This is a warning alert.',
      error:   'This is an error alert.',
    }} />
  ),
};

// ─── Trading context ──────────────────────────────────────────────────────────

export const WithTradingMessages: Story = {
  name: 'Trading context messages',
  render: () => (
    <SeverityStack messages={{
      success: 'Order filled: BUY 100 AAPL @ $182.34',
      info:    'Market data feed reconnected. Prices are now live.',
      warning: 'Your session will expire in 5 minutes. Save your work.',
      error:   'Order rejected: Insufficient buying power for this position.',
    }} />
  ),
};
