import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { TradeSideButton, ToggleButtonGroup, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof TradeSideButton> = {
  title: 'Molecules/TradeSideButton',
  component: TradeSideButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## TradeSideButton

A BUY/SELL toggle button with strong semantic color coding. Always used in a pair inside a \`ToggleButtonGroup\` to let the user select the trade direction in the Order Ticket.

---

### Why this component exists

The trade side selection is the most consequential input in the Order Ticket — selecting SELL instead of BUY in a live market has immediate financial impact. TradeSideButton enforces two rules that a plain ToggleButton cannot:

1. **Color semantics** — BUY is always green, SELL is always red. This is non-negotiable and must not be overridden by context.
2. **Label convention** — the labels are fixed ("BUY" and "SELL") and are not configurable, preventing inconsistent labelling.

---

### How it works

- Always render a BUY and SELL button together inside a \`ToggleButtonGroup\`.
- The group manages the selected value (\`'BUY'\` or \`'SELL'\`).
- Pass \`selected\` to the active button or rely on the group's value matching.
- The group fires \`onChange\` when the user clicks; the parent updates state.

\`\`\`tsx
<ToggleButtonGroup exclusive value={side} onChange={(_, v) => { if (v) setSide(v); }}>
  <TradeSideButton side="BUY"  sx={{ flex: 1 }} />
  <TradeSideButton side="SELL" sx={{ flex: 1 }} />
</ToggleButtonGroup>
\`\`\`

---

### Color rules

| Side | Unselected | Selected |
|---|---|---|
| **BUY** | Muted green outline | Filled green — \`success\` palette |
| **SELL** | Muted red outline | Filled red — \`error\` palette |

These colors persist through hover, focus, and active states. Green and red are never swapped.

---

### States

- **Unselected** — outlined with the side's semantic color, lower opacity.
- **Selected** — fully filled with the side's semantic color, full contrast.
- **Hover** — slightly deeper fill to signal interactivity.
- **Focus visible** — focus ring in the side's color, no background change.
- **Active / Pressed** — darkened fill on the click moment.

---

### Sizes

Inherits ToggleButton sizes: \`small\`, \`medium\` (default), \`large\`. The Order Ticket uses \`medium\`.

---

### Accessibility

Renders as \`<button aria-pressed="true|false">\`. The text labels "BUY" and "SELL" are the accessible names — no tooltip required. Color alone is never the only signal; the label always provides the semantic.

---

### Do / Don't

- ✅ Always show BUY and SELL together — never a standalone TradeSideButton.
- ✅ Pass \`sx={{ flex: 1 }}\` to both buttons so they share the group width equally.
- ❌ Do not override the button colors — green = BUY, red = SELL is a platform-wide convention.
- ❌ Do not use TradeSideButton outside the Order Ticket — for a generic side filter use ToggleButton.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TradeSideButton>;

// ─── SelectionMatrix ──────────────────────────────────────────────────────────
// Renders all 3 selection states (None / BUY selected / SELL selected) as rows.
// focusOn targets Mui-focusVisible on either the BUY or SELL button across all rows.

const ROWS = [
  { label: 'None',  value: null as null | 'BUY' | 'SELL', buySelected: false, sellSelected: false },
  { label: 'BUY',   value: 'BUY'  as const,               buySelected: true,  sellSelected: false },
  { label: 'SELL',  value: 'SELL' as const,               buySelected: false, sellSelected: true  },
] as const;

function SelectionMatrix({ focusOn }: { focusOn?: 'BUY' | 'SELL' }) {
  const buyClass  = focusOn === 'BUY'  ? 'Mui-focusVisible' : undefined;
  const sellClass = focusOn === 'SELL' ? 'Mui-focusVisible' : undefined;

  return (
    <Stack spacing={0}>
      {ROWS.map(({ label, value, buySelected, sellSelected }) => (
        <Stack key={label} direction="row" alignItems="center" spacing={2}>
          <Box sx={{ width: 80, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">{label} selected</Typography>
          </Box>
          <Box sx={{ p: '8px' }}>
            <ToggleButtonGroup exclusive value={value} sx={{ width: 240 }}>
              <TradeSideButton side="BUY"  sx={{ flex: 1 }} selected={buySelected}  className={buyClass}  />
              <TradeSideButton side="SELL" sx={{ flex: 1 }} selected={sellSelected} className={sellClass} />
            </ToggleButtonGroup>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

// ─── Interactive baseline ─────────────────────────────────────────────────────

export const Default: Story = {
  render: () => {
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    return (
      <ToggleButtonGroup
        exclusive
        value={side}
        onChange={(_, v) => { if (v) setSide(v); }}
        sx={{ width: 240 }}
      >
        <TradeSideButton side="BUY"  sx={{ flex: 1 }} />
        <TradeSideButton side="SELL" sx={{ flex: 1 }} />
      </ToggleButtonGroup>
    );
  },
};

// ─── State stories ────────────────────────────────────────────────────────────
// Each story shows all 3 selection states simultaneously via SelectionMatrix.

export const Resting: Story = {
  name: 'Resting',
  render: () => <SelectionMatrix />,
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
  render: () => <SelectionMatrix />,
};

/** Two matrices — focus ring on BUY (top) and on SELL (bottom) */
export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
  render: () => (
    <Stack spacing={3}>
      <SelectionMatrix focusOn="BUY" />
      <SelectionMatrix focusOn="SELL" />
    </Stack>
  ),
};

export const Active: Story = {
  name: 'Active press',
  parameters: { pseudo: { active: true } },
  render: () => <SelectionMatrix />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  name: 'Hover + Focus',
  parameters: { pseudo: { hover: true, focusVisible: true } },
  render: () => (
    <Stack spacing={3}>
      <SelectionMatrix focusOn="BUY" />
      <SelectionMatrix focusOn="SELL" />
    </Stack>
  ),
};

export const HoverActive: Story = {
  name: 'Hover + Active',
  parameters: { pseudo: { hover: true, active: true } },
  render: () => <SelectionMatrix />,
};

export const ActiveFocus: Story = {
  name: 'Active + Focus',
  parameters: { pseudo: { active: true, focusVisible: true } },
  render: () => (
    <Stack spacing={3}>
      <SelectionMatrix focusOn="BUY" />
      <SelectionMatrix focusOn="SELL" />
    </Stack>
  ),
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <Stack spacing={2}>
      {(['small', 'medium', 'large'] as const).map((size) => (
        <Stack key={size} direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 60 }}>
            <Typography variant="caption" color="text.secondary">{size}</Typography>
          </Box>
          <ToggleButtonGroup exclusive value="BUY" size={size} sx={{ width: 200 }}>
            <TradeSideButton side="BUY"  sx={{ flex: 1 }} selected />
            <TradeSideButton side="SELL" sx={{ flex: 1 }} />
          </ToggleButtonGroup>
        </Stack>
      ))}
    </Stack>
  ),
};
