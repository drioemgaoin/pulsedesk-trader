import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { FilterChip, Stack, Box, Typography } from '@pulsedesk/ui';
import type { OrderStatus } from '@pulsedesk/ui';

const meta: Meta<typeof FilterChip> = {
  title: 'Molecules/FilterChip',
  component: FilterChip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## FilterChip

An interactive toggle chip that represents a single filter option in a filter bar. Clicking it toggles the filter on or off. Active chips are visually filled; inactive chips are outlined.

---

### Why this component exists

Order history and portfolio views need fast, glanceable filtering. FilterChip encapsulates the complete behaviour of a status filter in a single component: the label, the color coding, the active/inactive visual state, hover and focus styles, and the click handler. This keeps filter bars consistent across every page that uses them.

---

### How it works

- Each chip maps to one \`OrderStatus\` value.
- \`isActive={true}\` → filled chip (filter is applied).
- \`isActive={false}\` → outlined chip (filter is not applied).
- Clicking fires \`onClick\` — the parent manages the active set in state.
- Multiple chips can be active simultaneously (additive filter).

---

### Color coding by status

Each order status has a fixed semantic color defined in the design system:

| Status | Color |
|---|---|
| PENDING | Warning / amber |
| ACCEPTED | Info / blue |
| FILLED | Success / green |
| PARTIALLY_FILLED | Info / blue |
| REJECTED | Error / red |
| CANCELLED | Default / muted |

---

### States

- **Active** — filled with the status color. The filter is applied.
- **Inactive** — outlined, muted. The filter is not applied.
- **Hover** — faint background tint signals the chip is clickable.
- **Focus visible** — focus ring only, no background change. Keyboard accessible.
- **Active press** — filled darker on click moment.

---

### Accessibility

FilterChip renders as \`<div role="button">\` with \`aria-pressed\` reflecting \`isActive\`. It is keyboard reachable via Tab and toggleable via Enter or Space.

---

### Do / Don't

- ✅ Always use FilterChip inside a horizontal wrapping row — chips should flow naturally on smaller screens.
- ✅ Wrap each chip in \`Box sx={{ p: '8px' }}\` to give focus rings clearance.
- ❌ Do not use FilterChip as a display-only badge — use StatusChip for read-only status display.
- ❌ Do not add \`onClick\` and then ignore the toggle — always reflect the state change in the parent.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof FilterChip>;

// ─── Shared constants ─────────────────────────────────────────────────────────

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'FILLED',
  'PARTIALLY_FILLED',
  'REJECTED',
  'CANCELLED',
];

// ─── ChipMatrix ───────────────────────────────────────────────────────────────
// Renders both active and inactive rows for all 6 statuses — the same idea as
// Button's StateMatrix (variants × semantics). Pass stateProps to apply the
// current state (hover, focus className, etc.) to every chip.

function ChipMatrix(stateProps: Partial<React.ComponentProps<typeof FilterChip>>) {
  return (
    <Stack spacing={0}>
      {([
        { label: 'Active',   isActive: true  },
        { label: 'Inactive', isActive: false },
      ] as const).map(({ label, isActive }) => (
        <Stack key={label} direction="row" alignItems="center">
          <Box sx={{ width: 64, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap">
            {ALL_STATUSES.map((status) => (
              <Box key={status} sx={{ p: '8px' }}>
                <FilterChip
                  status={status}
                  isActive={isActive}
                  onClick={() => {}}
                  {...stateProps}
                />
              </Box>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

// ─── Interactive baseline ─────────────────────────────────────────────────────
// Live toggle demo — click chips to toggle the filter on/off.

export const Interactive: Story = {
  render: () => {
    const [active, setActive] = useState<Set<OrderStatus>>(new Set(['FILLED', 'PENDING']));
    return (
      <Stack direction="row" flexWrap="wrap">
        {ALL_STATUSES.map((status) => (
          <Box key={status} sx={{ p: '8px' }}>
            <FilterChip
              status={status}
              isActive={active.has(status)}
              onClick={() => {
                setActive((prev) => {
                  const next = new Set(prev);
                  if (next.has(status)) next.delete(status);
                  else next.add(status);
                  return next;
                });
              }}
            />
          </Box>
        ))}
      </Stack>
    );
  },
};

// ─── State stories ────────────────────────────────────────────────────────────
// Each story shows both active and inactive appearances via ChipMatrix.

export const Default: Story = {
  render: () => <ChipMatrix />,
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
  render: () => <ChipMatrix />,
};

export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
  render: () => <ChipMatrix className="Mui-focusVisible" />,
};

export const Active: Story = {
  name: 'Active press',
  parameters: { pseudo: { active: true } },
  render: () => <ChipMatrix />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  name: 'Hover + Focus',
  parameters: { pseudo: { hover: true, focusVisible: true } },
  render: () => <ChipMatrix className="Mui-focusVisible" />,
};

export const HoverActive: Story = {
  name: 'Hover + Active',
  parameters: { pseudo: { hover: true, active: true } },
  render: () => <ChipMatrix />,
};

export const ActiveFocus: Story = {
  name: 'Active + Focus',
  parameters: { pseudo: { active: true, focusVisible: true } },
  render: () => <ChipMatrix className="Mui-focusVisible" />,
};
