import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { SideFilter } from '@pulsedesk/orders-mfe';
import { DEFAULT_FILTERS } from '@pulsedesk/orders-mfe';
import type { OrderFilters } from '@pulsedesk/orders-mfe';

const meta: Meta<typeof SideFilter> = {
  title: 'Molecules/SideFilter',
  component: SideFilter,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
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
