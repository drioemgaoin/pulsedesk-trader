import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Badge, IconButton, Stack, Box, Typography } from '@pulsedesk/ui';
import { FilterListIcon, DownloadIcon } from '@pulsedesk/ui';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Badge

A small numeric or dot overlay anchored to a corner of another element, used to indicate a count or the presence of new activity without taking up extra layout space.

---

### Why this component exists

Trading interfaces frequently need to surface counts in tight spaces — pending orders on a nav icon, active filters on a filter button, unread notifications on a toolbar icon. A Badge conveys this information in a single glance without disrupting the layout or requiring a label.

---

### Usage patterns

| Pattern | When to use |
|---|---|
| **Numeric badge** | Show an exact count (e.g. 3 active filters, 12 pending orders) |
| **Dot badge** (\`variant="dot"\`) | Indicate presence without a count (e.g. "something new here") |
| **Zero badge** (\`showZero\`) | Show 0 explicitly when the absence of a count is meaningful |
| **Max cap** (\`max={99}\`) | Cap large counts to avoid layout overflow (default: 99) |

---

### Semantic colors

Badge uses the same semantic color palette as the rest of the design system. Match the color to the meaning of the count:

| Color | Meaning |
|---|---|
| **primary** | Generic action count, neutral |
| **error** | Critical count: failed orders, errors requiring attention |
| **warning** | Caution count: items needing review |
| **success** | Positive count: completed items |
| **info** | Informational count |

---

### Accessibility

Badge counts are visible only — they do not add ARIA attributes automatically. If the count is meaningful to screen readers (e.g. "3 pending orders"), add \`aria-label\` to the wrapped icon or button describing both the action and the count.

---

### Do / Don't

- ✅ Anchor Badge to an icon or icon button that relates to the counted items.
- ✅ Use \`max\` to cap large numbers and prevent layout shifts.
- ❌ Do not use Badge on text or large elements — it is designed for icon-sized anchors.
- ❌ Do not use Badge as a substitute for a status chip or inline counter inside a table.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

// ─── Shared constants ─────────────────────────────────────────────────────────

const COLORS = ['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const;
type BadgeColor = typeof COLORS[number];

const COL_W = 88;

// ─── BadgeMatrix ──────────────────────────────────────────────────────────────
// Renders a variants (rows) × colors (columns) grid.
// Rows: count | dot | zero

function BadgeMatrix({ children = <DownloadIcon /> }: { children?: React.ReactNode }) {
  const rows = [
    { label: 'Count', props: { badgeContent: 3 } },
    { label: 'Dot',   props: { variant: 'dot' as const } },
    { label: 'Zero',  props: { badgeContent: 0, showZero: true } },
  ] as const;

  return (
    <Stack spacing={0}>
      {/* column headers */}
      <Stack direction="row">
        <Box sx={{ width: 56, flexShrink: 0 }} />
        {COLORS.map((color) => (
          <Box key={color} sx={{ width: COL_W, pl: '8px' }}>
            <Typography variant="caption" color="text.secondary">{color}</Typography>
          </Box>
        ))}
      </Stack>

      {/* one row per variant */}
      {rows.map(({ label, props }) => (
        <Stack key={label} direction="row" alignItems="center">
          <Box sx={{ width: 56, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
          {COLORS.map((color: BadgeColor) => (
            <Box key={color} sx={{ width: COL_W, p: '8px' }}>
              <Badge color={color} {...props}>
                {children}
              </Badge>
            </Box>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <BadgeMatrix />,
};

// ─── On IconButton ─────────────────────────────────────────────────────────────
// Shows the most common real-world placement: a numeric badge on an icon button.

export const WithIconButton: Story = {
  render: () => (
    <Stack spacing={0}>
      {/* column headers */}
      <Stack direction="row">
        <Box sx={{ width: 56, flexShrink: 0 }} />
        {COLORS.map((color) => (
          <Box key={color} sx={{ width: COL_W, pl: '8px' }}>
            <Typography variant="caption" color="text.secondary">{color}</Typography>
          </Box>
        ))}
      </Stack>
      <Stack direction="row" alignItems="center">
        <Box sx={{ width: 56, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">Count</Typography>
        </Box>
        {COLORS.map((color) => (
          <Box key={color} sx={{ width: COL_W, p: '8px' }}>
            <IconButton>
              <Badge badgeContent={3} color={color}>
                <FilterListIcon />
              </Badge>
            </IconButton>
          </Box>
        ))}
      </Stack>
    </Stack>
  ),
};
