import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { SearchField, Stack, Box, Typography } from "@pulsedesk/ui";

const meta: Meta<typeof SearchField> = {
  title: "Molecules/SearchField",
  component: SearchField,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
## SearchField

A text input pre-configured for search interactions. It includes a search icon as a start adornment and a clear button when a value is present, so users can immediately recognise it as a search box and reset it in one click.

---

### Why this component exists

The Watchlist, the Orders page, and the Portfolio table all need symbol search. A plain TextField would work but would require every usage to manually add the magnifying glass icon, wire up the clear button, and standardise the placeholder pattern. SearchField encapsulates all of that so every search input across the platform looks and behaves identically.

---

### How it works

- Uncontrolled by default — manages its own value, fires \`onChange\` on every keystroke.
- Pass \`value\` + \`onChange\` to make it controlled (required when the parent needs to react to changes or debounce).
- The clear (×) button appears automatically when a value is present and fires \`onChange\` with an empty string.

---

### States

- **Default** — empty, search icon visible.
- **With value** — text present, clear button appears on the right.
- **Focused** — blue border, label floats.
- **Hover** — border darkens to signal interactivity.
- **Disabled** — greyed out, not editable.

Unlike TextField, SearchField has no \`error\` state — it is never used inside a validated form.

---

### Sizes

| Size | Height | Context |
|---|---|---|
| **small** | 32 px | Compact filter rows, dense panels (e.g. Watchlist) |
| **medium** | 40 px | Default, standard filter bars |
| **large** | 48 px | Prominent search bars, hero inputs |

---

### Do / Don't

- ✅ Use SearchField for all symbol/text search inputs — never a plain TextField.
- ✅ Debounce the \`onChange\` handler on the parent side when the search triggers an API call.
- ❌ Do not remove the clear button — users expect to be able to reset search without selecting all text.
- ❌ Do not use SearchField for non-search inputs (e.g. price entry) — use TextField instead.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SearchField>;

// ─── StateRow ─────────────────────────────────────────────────────────────────
// Renders one SearchField in a padded box for focus-ring clearance.

const FIELD_W = 280;

function StateRow(props: React.ComponentProps<typeof SearchField>) {
  return (
    <Box sx={{ p: "8px", display: "inline-block" }}>
      <SearchField sx={{ width: FIELD_W }} {...props} />
    </Box>
  );
}

// ─── State stories ────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <Box sx={{ p: "8px", display: "inline-block" }}>
      <SearchField
        placeholder="Search symbols…"
        sx={{
          width: FIELD_W,
          pointerEvents: "none",
          "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--pd-border-default)",
          },
        }}
      />
    </Box>
  ),
};

export const WithValue: Story = {
  name: "With value (clear button visible)",
  render: () => <StateRow defaultValue="AAPL" />,
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
  render: () => <StateRow placeholder="Search symbols…" />,
};

export const Focused: Story = {
  parameters: { pseudo: { focusWithin: true, focusVisible: true } },
  render: () => <StateRow placeholder="Search symbols…" focused />,
};

export const Disabled: Story = {
  render: () => <StateRow placeholder="Search symbols…" disabled />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocused: Story = {
  name: "Hover + Focused",
  parameters: { pseudo: { hover: true, focusWithin: true } },
  render: () => <StateRow placeholder="Search symbols…" focused />,
};

// ─── Sizes ────────────────────────────────────────────────────────────────────
// defaultValue keeps the clear button visible so each size shows its full UI.

export const Sizes: Story = {
  render: () => (
    <Stack spacing={3}>
      {(["small", "medium", "large"] as const).map((size) => (
        <Box key={size}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: "block", textTransform: "capitalize" }}
          >
            {size}
          </Typography>
          <Box sx={{ p: "8px", display: "inline-block" }}>
            <SearchField
              size={size}
              defaultValue="AAPL"
              sx={{ width: FIELD_W }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  ),
};
