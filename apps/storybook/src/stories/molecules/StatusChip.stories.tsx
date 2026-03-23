import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { StatusChip, Stack, Box, Typography } from '@pulsedesk/ui';
import type { OrderStatus } from '@pulsedesk/ui';

const meta: Meta<typeof StatusChip> = {
  title: 'Molecules/StatusChip',
  component: StatusChip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## StatusChip

A read-only color-coded badge that displays the current status of an order. It is the standard way to render order status anywhere in the platform — table rows, detail panels, and expanded row views.

---

### Why this component exists

Order status is one of the most important data points in an order management system. A trader scanning a table with hundreds of orders needs to identify filled, rejected, and pending orders in milliseconds. StatusChip provides a consistent color-coded signal for every status so the user never needs to parse plain text.

---

### Status mapping

| Status | Color | Meaning |
|---|---|---|
| **PENDING** | Warning / amber | Order submitted, awaiting matching engine acceptance |
| **ACCEPTED** | Info / blue | Accepted by the engine, not yet filled |
| **FILLED** | Success / green | Order fully executed |
| **REJECTED** | Error / red | Rejected by the engine (see rejection reason) |
| **CANCELLED** | Slate / muted | Cancelled by the user or system |

---

### StatusChip vs FilterChip

| Component | Purpose | Interactive? |
|---|---|---|
| **StatusChip** | Display the status of a specific order | No — read-only badge |
| **FilterChip** | Toggle a status filter on/off in a filter bar | Yes — clickable toggle |

Use StatusChip in table rows and detail panels. Use FilterChip in filter bars.

---

### Accessibility

StatusChip renders as a non-interactive \`<div>\`. The text label is always visible — color is a supplementary signal, not the only one. This ensures the status is legible for colorblind users and in printed reports.

---

### Do / Don't

- ✅ Use StatusChip for every order status in every table and detail view.
- ✅ Always show the text label — never a color-only dot for status in tabular data.
- ❌ Do not make StatusChip interactive — use FilterChip for clickable status filters.
- ❌ Do not create ad-hoc colored spans for order status — always use this component.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof StatusChip>;

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'FILLED',
  'REJECTED',
  'CANCELLED',
];

// ─── All statuses ─────────────────────────────────────────────────────────────

export const AllStatuses: Story = {
  name: 'All statuses',
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {ALL_STATUSES.map((status) => (
        <StatusChip key={status} status={status} />
      ))}
    </Stack>
  ),
};

// ─── In context (label + chip) ────────────────────────────────────────────────

export const InContext: Story = {
  name: 'In context',
  render: () => (
    <Stack spacing={1} sx={{ maxWidth: 500 }}>
      {ALL_STATUSES.map((status) => (
        <Stack key={status} direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 160 }}>
            <Typography variant="body2" color="text.secondary">{status}</Typography>
          </Box>
          <StatusChip status={status} />
        </Stack>
      ))}
    </Stack>
  ),
};
