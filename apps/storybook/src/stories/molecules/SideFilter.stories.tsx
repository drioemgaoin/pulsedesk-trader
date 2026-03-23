import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { SideFilter } from '@pulsedesk/orders-mfe';
import { DEFAULT_FILTERS } from '@pulsedesk/orders-mfe';
import type { OrderFilters } from '@pulsedesk/orders-mfe';

const meta: Meta<typeof SideFilter> = {
  title: 'Molecules/SideFilter',
  component: SideFilter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## SideFilter

The full filter panel for the Orders page. It combines all filter controls — status chips, symbol search, side toggle, and date range — into a single cohesive sidebar component.

---

### Why this component exists

Order history filtering involves multiple dimensions simultaneously: a user might want "FILLED BUY orders for AAPL between Jan–Mar". Handling this with scattered, uncoordinated inputs would make the state management complex and the UX inconsistent. SideFilter owns all filter state in one place and exposes a single \`onChange\` callback with the complete \`OrderFilters\` object, so the parent only needs to react to one event.

---

### Controls inside SideFilter

| Control | Filter dimension | Component used |
|---|---|---|
| Status chips | Order status (multi-select) | FilterChip × 6 |
| Symbol search | Symbol (text match) | SearchField |
| Side toggle | BUY / SELL / All | TradeSideButton / ToggleButton |
| Date from | Earliest creation date | TextField (date) |
| Date to | Latest creation date | TextField (date) |

---

### Data contract

\`\`\`ts
interface OrderFilters {
  statuses: OrderStatus[];   // empty = all statuses
  symbols:  string[];        // empty = all symbols
  side:     'BUY' | 'SELL' | null;  // null = both sides
  dateFrom: string | null;   // ISO date string or null
  dateTo:   string | null;
}
\`\`\`

The parent passes the current filters and an \`onChange\` handler. SideFilter never mutates — it always produces a new filters object.

---

### Usage

\`\`\`tsx
const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
<SideFilter filters={filters} onChange={setFilters} />
\`\`\`

---

### Do / Don't

- ✅ Use \`DEFAULT_FILTERS\` for the initial state — it is the canonical empty filter object.
- ✅ Apply filters on every change (the parent re-fetches or re-filters the table immediately).
- ❌ Do not add a "Apply" button — filters should be live, not batched.
- ❌ Do not use SideFilter outside the Orders page — other pages have their own filter patterns.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SideFilter>;

// ─── Interactive ──────────────────────────────────────────────────────────────

export const Interactive: Story = {
  name: 'Interactive — all controls',
  render: () => {
    const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
    return (
      <div style={{ width: 280 }}>
        <SideFilter filters={filters} onChange={setFilters} />
        <pre style={{ marginTop: 16, fontSize: 11, opacity: 0.6 }}>
          {JSON.stringify(filters, null, 2)}
        </pre>
      </div>
    );
  },
};

// ─── Pre-filled ───────────────────────────────────────────────────────────────

export const PreFilled: Story = {
  name: 'Pre-filled filters',
  render: () => {
    const initial: OrderFilters = {
      statuses: ['PENDING', 'FILLED'],
      symbols: ['AAPL', 'TSLA'],
      side: 'BUY',
      dateFrom: '2025-01-01',
      dateTo: '2025-06-30',
    };
    const [filters, setFilters] = useState<OrderFilters>(initial);
    return (
      <div style={{ width: 280 }}>
        <SideFilter filters={filters} onChange={setFilters} />
      </div>
    );
  },
};
