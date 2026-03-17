import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Table, TableHead, TableRow } from '@pulsedesk/ui';
import { SortableHeader } from '@pulsedesk/portfolio-mfe';
import type { SortState, SortKey } from '@pulsedesk/portfolio-mfe';

const meta: Meta<typeof SortableHeader> = {
  title: 'Molecules/SortableHeader',
  component: SortableHeader,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <Table size="small">
        <TableHead>
          <TableRow>
            <Story />
          </TableRow>
        </TableHead>
      </Table>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SortableHeader>;

// ─── Default (inactive) ───────────────────────────────────────────────────────

export const Inactive: Story = {
  name: 'Inactive sort column',
  args: {
    label: 'Symbol',
    sortKey: 'symbol',
    align: 'left',
    sort: { key: 'unrealizedPnl', direction: 'desc' },
    onSort: () => {},
  },
};

// ─── Active ascending ─────────────────────────────────────────────────────────

export const ActiveAsc: Story = {
  name: 'Active — ascending',
  args: {
    label: 'Unrealized P&L',
    sortKey: 'unrealizedPnl',
    align: 'right',
    tooltip: 'Profit or loss if all shares were sold at the current market price',
    sort: { key: 'unrealizedPnl', direction: 'asc' },
    onSort: () => {},
  },
};

// ─── Active descending ────────────────────────────────────────────────────────

export const ActiveDesc: Story = {
  name: 'Active — descending',
  args: {
    label: 'Market Price',
    sortKey: 'marketPrice',
    align: 'right',
    sort: { key: 'marketPrice', direction: 'desc' },
    onSort: () => {},
  },
};

// ─── Interactive ──────────────────────────────────────────────────────────────

export const Interactive: Story = {
  name: 'Interactive — click to sort',
  render: () => {
    const [sort, setSort] = useState<SortState>({ key: 'symbol', direction: 'asc' });
    function handleSort(key: SortKey) {
      setSort((prev) => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    }
    const cols: Array<{ label: string; sortKey: SortKey; align: 'left' | 'right'; tooltip?: string }> = [
      { label: 'Symbol',     sortKey: 'symbol',        align: 'left' },
      { label: 'Qty',        sortKey: 'quantity',      align: 'right' },
      { label: 'Avg Cost',   sortKey: 'averageCost',   align: 'right', tooltip: 'Average price paid per share' },
      { label: 'Mkt Price',  sortKey: 'marketPrice',   align: 'right' },
      { label: 'P&L',        sortKey: 'unrealizedPnl', align: 'right', tooltip: 'Unrealized profit or loss' },
      { label: '% Return',   sortKey: 'pctReturn',     align: 'right' },
    ];
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            {cols.map((c) => (
              <SortableHeader key={c.sortKey} {...c} sort={sort} onSort={handleSort} />
            ))}
          </TableRow>
        </TableHead>
      </Table>
    );
  },
};
