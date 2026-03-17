import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Table, TableHead, TableRow } from "@pulsedesk/ui";
import { SortableHeader } from "@pulsedesk/portfolio-mfe";
import type { SortState, SortKey } from "@pulsedesk/portfolio-mfe";

const meta: Meta<typeof SortableHeader> = {
  title: "Molecules/SortableHeader",
  component: SortableHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
## SortableHeader

A table column header cell that displays a sort direction indicator and cycles through ascending → descending → unsorted on click. It is the standard header for all sortable columns in portfolio and order tables.

---

### Why this component exists

Sorting is critical in portfolio and order tables — a trader needs to quickly find the position with the largest loss, or the oldest pending order. SortableHeader handles the entire presentation layer of sorting: the icon direction, the active/inactive visual state, and the accessible label. The parent component only needs to track \`{ key, direction }\` in state.

---

### How it works

- Each sortable column renders one SortableHeader.
- Pass the current \`sort\` state (the active sort key + direction) to all headers simultaneously.
- A header is **active** when \`sort.key === sortKey\`.
- Clicking an active header toggles the direction (asc ↔ desc).
- Clicking an inactive header activates it with ascending order.
- The \`onSort\` callback fires with the column's \`sortKey\` — the parent updates state.

---

### Props

- **label** — column display name (e.g. "Symbol", "Unrealized P&L")
- **sortKey** — the data key this column sorts by (e.g. \`'symbol'\`, \`'unrealizedPnl'\`)
- **align** — \`'left'\` or \`'right'\` — right-aligned for numeric columns
- **tooltip** — optional tooltip explaining the column value (e.g. "Average price paid per share")
- **sort** — the current sort state \`{ key: SortKey; direction: 'asc' | 'desc' }\`
- **onSort** — callback fired with this column's sortKey on click

---

### Visual states

| State | Appearance |
|---|---|
| **Inactive** | Muted text, no arrow icon |
| **Active ascending** | Full-contrast text, ↑ arrow |
| **Active descending** | Full-contrast text, ↓ arrow |

---

### Accessibility

SortableHeader renders as a \`<th>\` with \`aria-sort="ascending"\` or \`"descending"\` when active, \`"none"\` when inactive. Screen readers announce the sort state when the user focuses the header.

---

### Do / Don't

- ✅ Right-align (\`align="right"\`) all numeric columns — it keeps decimal points aligned.
- ✅ Provide \`tooltip\` for columns with abbreviated labels or complex calculations.
- ❌ Do not use SortableHeader for non-sortable columns — use a plain \`<TableCell>\` instead.
        `,
      },
    },
  },
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

// ─── Inactive (no arrow) ──────────────────────────────────────────────────────

export const Inactive: Story = {
  name: "Inactive — no arrow",
  render: () => (
    <SortableHeader
      label="Symbol"
      sortKey="symbol"
      align="left"
      sort={{ key: "unrealizedPnl", direction: "desc" }}
      onSort={() => {}}
    />
  ),
};

// ─── Hover (gray arrow) ───────────────────────────────────────────────────────
// inline: false (iframe) + pseudo addon = infinite postMessage loop.
// Rendering inline is fine — other stories (Button, TextField) use the same pattern.

export const Hover: Story = {
  name: "Hover — gray arrow",
  parameters: { pseudo: { hover: true } },
  render: () => (
    <SortableHeader
      label="Symbol"
      sortKey="symbol"
      align="left"
      sort={{ key: "unrealizedPnl", direction: "desc" }}
      onSort={() => {}}
    />
  ),
};

// ─── Active ascending (orange ↑) ──────────────────────────────────────────────

export const ActiveAsc: Story = {
  name: "Active — ascending (orange ↑)",
  render: () => (
    <SortableHeader
      label="Unrealized P&L"
      sortKey="unrealizedPnl"
      align="right"
      tooltip="Profit or loss if all shares were sold at the current market price"
      sort={{ key: "unrealizedPnl", direction: "asc" }}
      onSort={() => {}}
    />
  ),
};

// ─── Active descending (orange ↓) ─────────────────────────────────────────────

export const ActiveDesc: Story = {
  name: "Active — descending (orange ↓)",
  render: () => (
    <SortableHeader
      label="Market Price"
      sortKey="marketPrice"
      align="right"
      sort={{ key: "marketPrice", direction: "desc" }}
      onSort={() => {}}
    />
  ),
};

// ─── Interactive ──────────────────────────────────────────────────────────────
// Note: render returns header cells only — the meta decorator supplies Table > TableHead > TableRow.

export const Interactive: Story = {
  name: "Interactive — click to sort",
  render: () => {
    const [sort, setSort] = useState<SortState>({
      key: "symbol",
      direction: "asc",
    });
    function handleSort(key: SortKey) {
      setSort((prev) => ({
        key,
        direction:
          prev.key === key && prev.direction === "asc" ? "desc" : "asc",
      }));
    }
    const cols: Array<{
      label: string;
      sortKey: SortKey;
      align: "left" | "right";
      tooltip?: string;
    }> = [
      { label: "Symbol", sortKey: "symbol", align: "left" },
      { label: "Qty", sortKey: "quantity", align: "right" },
      {
        label: "Avg Cost",
        sortKey: "averageCost",
        align: "right",
        tooltip: "Average price paid per share",
      },
      { label: "Mkt Price", sortKey: "marketPrice", align: "right" },
      {
        label: "P&L",
        sortKey: "unrealizedPnl",
        align: "right",
        tooltip: "Unrealized profit or loss",
      },
      { label: "% Return", sortKey: "pctReturn", align: "right" },
    ];
    return (
      <>
        {cols.map((c) => (
          <SortableHeader
            key={c.sortKey}
            {...c}
            sort={sort}
            onSort={handleSort}
          />
        ))}
      </>
    );
  },
};
