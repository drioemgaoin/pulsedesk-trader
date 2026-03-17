import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import {
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Box,
  Typography,
} from "@pulsedesk/ui";

const meta: Meta<typeof ToggleButton> = {
  title: "Atoms/ToggleButton",
  component: ToggleButton,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
## ToggleButton

A segmented button group where each option is mutually exclusive (or multi-selectable). Users click once to select, click again to deselect. The selected option is visually distinct from the others.

---

### Why this component exists

Trading interfaces frequently need to switch between a small, fixed set of modes — filter by side (All / Buy / Sell), switch chart timeframe, or select order type. A ToggleButton group communicates these options as a connected unit, making the relationship between choices explicit and reducing the visual weight compared to a row of separate buttons.

---

### How it works

- ToggleButton is always used inside a \`ToggleButtonGroup\`.
- Pass \`exclusive\` to the group for single-select (radio behaviour).
- Omit \`exclusive\` for multi-select (checkbox behaviour).
- The \`value\` on the group reflects the currently selected option(s).
- Control the group by managing \`value\` + \`onChange\` in state.

---

### States

| State | Visual |
|---|---|
| **Unselected** | Subtle border, muted text |
| **Selected** | Filled background, full-contrast text — the active choice is unmistakable |
| **Hover** | Background tint on the hovered button |
| **Focus visible** | Focus ring on the focused button, no background change |
| **Active / Pressed** | Darker fill on the moment of click |
| **Disabled** | Greyed out, not clickable |

---

### Sizes

- **small** — compact toolbars, filter bars in dense panels
- **medium** — default, standard toolbars
- **large** — prominent position selectors (e.g. Order Ticket BUY/SELL)

For the BUY/SELL toggle specifically, use \`TradeSideButton\` which extends ToggleButton with colour-coded semantics.

---

### Accessibility

Each ToggleButton renders as \`<button>\` with \`aria-pressed\` reflecting the selected state. The group has implicit \`role="group"\`. Keyboard users can Tab into the group and use arrow keys to move between options.

---

### Do / Don't

- ✅ Use for 2–5 options that are peers. More than 5 should be a Select or Tabs.
- ✅ Always pair with \`ToggleButtonGroup\` — never use a standalone ToggleButton.
- ❌ Do not use ToggleButton for navigation between pages — use Tabs or NavBar.
- ❌ Do not mix ToggleButtonGroup with other unrelated buttons in the same group.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ToggleButton>;

// ─── StateGroup ───────────────────────────────────────────────────────────────
// A ToggleButtonGroup with one selected and two unselected buttons.
// Applying a pseudo state (hover, active) to the story shows both selected and
// unselected appearances simultaneously — the same idea as Button's StateMatrix.
//
// For focus states that require className on a specific button, pass focusOn:
//   'selected'   → Mui-focusVisible on the selected button
//   'unselected' → Mui-focusVisible on an unselected button

function StateGroup({
  focusOn,
  disabled = false,
}: {
  focusOn?: "selected" | "unselected";
  disabled?: boolean;
}) {
  const selectedClass = focusOn === "selected" ? "Mui-focusVisible" : undefined;
  const unselectedClass =
    focusOn === "unselected" ? "Mui-focusVisible" : undefined;

  return (
    <Box sx={{ p: "8px" }}>
      <ToggleButtonGroup exclusive value="a">
        <ToggleButton
          value="a"
          selected
          disabled={disabled}
          className={selectedClass}
        >
          Selected
        </ToggleButton>
        <ToggleButton value="b" disabled={disabled} className={unselectedClass}>
          Unselected
        </ToggleButton>
        <ToggleButton value="c" disabled={disabled}>
          Other
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

// ─── Interactive baseline ─────────────────────────────────────────────────────

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={(_, v) => {
          if (v) setValue(v);
        }}
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="buy">Buy</ToggleButton>
        <ToggleButton value="sell">Sell</ToggleButton>
      </ToggleButtonGroup>
    );
  },
};

// ─── State stories ────────────────────────────────────────────────────────────
// Each story shows both selected and unselected appearances in the same view.

/** Hover applies to all buttons simultaneously — shows selected-hover and unselected-hover together */
export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
  render: () => <StateGroup />,
};

/** Two groups: focus ring on unselected button (top) and on selected button (bottom) */
export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
  render: () => (
    <Stack spacing={2}>
      <StateGroup focusOn="unselected" />
      <StateGroup focusOn="selected" />
    </Stack>
  ),
};

/** Active press applies to all buttons — shows both selected-active and unselected-active */
export const Active: Story = {
  parameters: { pseudo: { active: true } },
  render: () => <StateGroup />,
};

export const Disabled: Story = {
  render: () => <StateGroup disabled />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  name: "Hover + Focus",
  parameters: { pseudo: { hover: true, focusVisible: true } },
  render: () => (
    <Stack spacing={2}>
      <StateGroup focusOn="unselected" />
      <StateGroup focusOn="selected" />
    </Stack>
  ),
};

export const HoverActive: Story = {
  name: "Hover + Active",
  parameters: { pseudo: { hover: true, active: true } },
  render: () => <StateGroup />,
};

export const ActiveFocus: Story = {
  name: "Active + Focus",
  parameters: { pseudo: { active: true, focusVisible: true } },
  render: () => (
    <Stack spacing={2}>
      <StateGroup focusOn="unselected" />
      <StateGroup focusOn="selected" />
    </Stack>
  ),
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <Stack spacing={2}>
      {(["small", "medium", "large"] as const).map((size) => (
        <Stack key={size} direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 56, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {size}
            </Typography>
          </Box>
          <ToggleButtonGroup exclusive value="a" size={size}>
            <ToggleButton value="a" selected>
              Selected
            </ToggleButton>
            <ToggleButton value="b">Other</ToggleButton>
            <ToggleButton value="c">Other</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      ))}
    </Stack>
  ),
};
