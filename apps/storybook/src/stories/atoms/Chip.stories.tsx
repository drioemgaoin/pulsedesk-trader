import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Chip, Stack, Box, Typography } from '@pulsedesk/ui';
import { CHIP_COLORS, CHIP_VARIANTS, ChipStateMatrix } from './_chip-story-helpers';

const meta: Meta<typeof Chip> = {
  title: 'Atoms/Chip',
  component: Chip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Chip

A compact, pill-shaped element that represents an attribute, status, filter, or category. Chips surface high-density metadata inline without the visual weight of a full button or badge.

---

### Why this component exists

Trading dashboards display dozens of data points per row — order status, asset class, side, strategy tag. Rendering each as plain text buries the signal. Chips add just enough visual weight (color, border, shape) to make these values scannable at a glance while keeping them small enough to sit inline with other content.

The \`label\` prop is **required** by design. A chip without text has no meaning — use an \`Avatar\` or \`Badge\` for icon-only or numeric indicators.

---

### Variants — selection state

| Variant | Role | When to use |
|---|---|---|
| **Filled** | Selected / active state | The filter is applied, the tag is active, the status is the current one |
| **Outlined** | Unselected / passive state | Available options not yet chosen, inactive tags, secondary metadata |

The filled ↔ outlined toggle is the primary way to communicate whether a chip is *active* or *available*.

---

### Semantic colors — meaning at a glance

| Color | Meaning | Example use |
|---|---|---|
| **Default** | Neutral, no semantic load | Generic tags, plain labels |
| **Primary** | Brand highlight | Selected primary filter |
| **Secondary** | Supporting highlight | Secondary category, sub-filter |
| **Success** | Positive / completed | *Filled*, *Executed*, *Active position* |
| **Error** | Negative / failed | *Rejected*, *Cancelled*, *Error* |
| **Warning** | Caution / pending | *Pending*, *Awaiting approval* |
| **Info** | Informational / neutral | *Partial fill*, *Queued* |

---

### Interactive vs static chips

Chips are **static by default** — they render as a \`<div>\` and have no hover or focus states.

Pass an \`onClick\` handler to make a chip **interactive**. It then renders as a \`<div role="button">\`, becomes keyboard-accessible (Tab + Enter/Space), and shows hover, active, and focus-ring states. This is how filter chips work — clicking toggles their selected state.

---

### Chip vs Button — when to use which

| Situation | Use |
|---|---|
| Trigger an action (place order, confirm, submit) | **Button** |
| Represent a filter, tag, or status value | **Chip** |
| Toggle a category on/off in a filter bar | **Chip** (interactive, filled when selected) |
| Dismiss / remove an item | **Chip** with \`onDelete\` |

---

### Accessibility

Static chips have no keyboard role. Interactive chips (with \`onClick\`) receive \`role="button"\` and are reachable via Tab. The focus ring follows the same outer double-ring pattern as outlined buttons for visual consistency across interactive elements.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Chip>;

// ─── State stories ────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <ChipStateMatrix />,
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
  render: () => <ChipStateMatrix onClick={() => {}} />,
};

export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
  render: () => <ChipStateMatrix onClick={() => {}} className="Mui-focusVisible" />,
};

export const Active: Story = {
  parameters: { pseudo: { active: true } },
  render: () => <ChipStateMatrix onClick={() => {}} />,
};

export const Disabled: Story = {
  render: () => <ChipStateMatrix disabled />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  name: 'Hover + Focus',
  parameters: { pseudo: { hover: true, focusVisible: true } },
  render: () => <ChipStateMatrix onClick={() => {}} className="Mui-focusVisible" />,
};

export const ActiveFocus: Story = {
  name: 'Active + Focus',
  parameters: { pseudo: { active: true, focusVisible: true } },
  render: () => <ChipStateMatrix onClick={() => {}} className="Mui-focusVisible" />,
};

export const HoverActive: Story = {
  name: 'Hover + Active',
  parameters: { pseudo: { hover: true, active: true } },
  render: () => <ChipStateMatrix onClick={() => {}} />,
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_COL_WIDTH: Record<string, number> = { small: 110, medium: 130, large: 150 };

export const Sizes: Story = {
  render: () => (
    <Stack spacing={4}>
      {(['small', 'medium', 'large'] as const).map((size) => (
        <Stack key={size} spacing={1}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: 'capitalize' }}
          >
            {size}
          </Typography>
          <Stack direction="row" spacing={3}>
            {CHIP_VARIANTS.map((variant) => (
              <Stack key={variant} sx={{ width: SIZE_COL_WIDTH[size] }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', mb: '4px' }}>
                  {variant}
                </Typography>
                <Stack>
                  {CHIP_COLORS.map((color) => (
                    <Box key={color} sx={{ p: '8px' }}>
                      <Chip
                        variant={variant}
                        color={color}
                        // @ts-expect-error size="large" is a custom extension
                        size={size}
                        label={color}
                      />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  ),
};
