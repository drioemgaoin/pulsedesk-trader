import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { RowDetail } from '@pulsedesk/orders-mfe';
import type { OrderResponseV1 } from '@pulsedesk/orders-mfe';

const BASE_ORDER: OrderResponseV1 = {
  id: 'ord-00000001-0000-0000-0000-000000000001',
  commandId: 'cmd-00000001-0000-0000-0000-000000000001',
  accountId: 'trader',
  symbol: 'AAPL',
  side: 'BUY',
  type: 'LIMIT',
  quantity: 100,
  limitPrice: 189.5,
  status: 'FILLED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  rejectionReason: null,
};

const meta: Meta<typeof RowDetail> = {
  title: 'Molecules/RowDetail',
  component: RowDetail,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## RowDetail

An expanded detail panel that appears inline below an order table row when the user clicks to inspect a specific order. It shows all fields of the order in a structured, readable layout.

---

### Why this component exists

An order table row shows only the most important columns — symbol, side, quantity, status. Many fields (command ID, account ID, limit price, rejection reason, timestamps) are omitted to keep the table scannable. RowDetail gives users access to the full record without navigating away or opening a modal, by expanding in place below the selected row.

---

### What it displays

- **Core fields** — Symbol, side (BUY/SELL), order type (LIMIT/MARKET), quantity, limit price
- **Identifiers** — Order ID, Command ID, Account ID (monospaced for easy copying)
- **Status** — Rendered with StatusChip for at-a-glance recognition
- **Rejection reason** — Shown only when present (i.e. REJECTED orders)
- **Timestamps** — Created at and updated at, formatted for readability

---

### Adaptive rendering

- The \`limitPrice\` field is hidden for MARKET orders (no price applies).
- The \`rejectionReason\` field is hidden when \`null\` — it only appears for REJECTED status.
- All other fields are always present.

---

### Usage

RowDetail is rendered inside the Orders page table, controlled by a selected row ID in local state. It receives a full \`OrderResponseV1\` object from the parent.

---

### Do / Don't

- ✅ Pass the complete order object — the component decides what to show.
- ✅ Show RowDetail for only one row at a time — collapsing the previous selection on new click.
- ❌ Do not use RowDetail outside the orders table context — it is designed for tabular row expansion.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof RowDetail>;

export const Filled: Story = {
  name: 'Filled order',
  render: () => <RowDetail order={BASE_ORDER} />,
};

export const WithRejectionReason: Story = {
  name: 'Rejected — with reason',
  render: () => (
    <RowDetail order={{ ...BASE_ORDER, status: 'REJECTED', limitPrice: null, rejectionReason: 'Insufficient buying power' }} />
  ),
};

export const MarketOrder: Story = {
  name: 'Market order (no limit price)',
  render: () => (
    <RowDetail order={{ ...BASE_ORDER, type: 'MARKET', limitPrice: null }} />
  ),
};
