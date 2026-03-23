import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { IconButton, Stack, Box, Tooltip, Typography } from '@pulsedesk/ui';
import {
  CancelIcon,
  DownloadIcon,
  FilterListIcon,
  MenuIcon,
} from '@pulsedesk/ui';

const meta: Meta<typeof IconButton> = {
  title: 'Atoms/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## IconButton

A clickable icon with no visible label. The most space-efficient way to expose an action when the icon alone is universally understood or a Tooltip provides the label on demand.

---

### Why this component exists

Trading toolbars, table rows, and panel headers are dense. A labelled button eats space that belongs to data. IconButton keeps toolbars compact while remaining fully accessible via Tooltip and keyboard navigation.

---

### When to use IconButton vs Button

| Situation | Use |
|---|---|
| Action is universally understood from the icon (close, download, filter, menu) | **IconButton** |
| Action is critical or destructive and needs a clear text label | **Button** |
| Limited horizontal space and icon + Tooltip is sufficient | **IconButton** |
| Form submission or confirmation flow | **Button** |

---

### Colors

| Color | Meaning |
|---|---|
| **default** | Neutral toolbar action |
| **primary** | Brand-highlighted action, primary call to action in a toolbar |
| **error** | Destructive action (delete, force-close position) |
| **success** | Confirmatory action |
| **warning** | Caution action |

---

### Sizes

- **small** — compact toolbars, table row actions
- **medium** — default, standard toolbar buttons
- **large** — standalone prominent actions

---

### Accessibility

IconButton renders as a \`<button>\` element. Always wrap it in a \`<Tooltip title="...">\` so screen readers and keyboard users understand the action. Without a tooltip, the button has no accessible name.

---

### States

- **Hover** — subtle background ring signals interactivity.
- **Focus visible** — keyboard focus ring added on top of default appearance. No background change.
- **Active / Pressed** — filled background confirms the click moment.
- **Disabled** — greyed out, non-interactive.

---

### Do / Don't

- ✅ Always provide a \`Tooltip\` with a descriptive label.
- ✅ Match color to the consequence of the action.
- ❌ Do not use IconButton for navigation — use a NavBar link or Link.
- ❌ Do not use an unclear icon without a tooltip.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

// ─── Shared constants ─────────────────────────────────────────────────────────

const ICON_COLORS = ['default', 'primary', 'error', 'success', 'warning'] as const;
type IconColor = typeof ICON_COLORS[number];

// Wrap each icon button in a padded Box so focus rings and hover rings never
// clip against adjacent items or the story canvas edge.
const PAD = '8px' as const;

// ─── ColorRow ─────────────────────────────────────────────────────────────────
// Renders all 5 colors in a row for a given state.
// Extra props (disabled, className) are forwarded to every button.

function ColorRow(stateProps: Omit<React.ComponentProps<typeof IconButton>, 'color' | 'children'>) {
  return (
    <Stack direction="row">
      {ICON_COLORS.map((color: IconColor) => (
        <Box key={color} sx={{ p: PAD }}>
          <IconButton color={color} {...stateProps}><MenuIcon /></IconButton>
        </Box>
      ))}
    </Stack>
  );
}

// ─── State stories ────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <ColorRow />,
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
  render: () => <ColorRow />,
};

export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
  render: () => <ColorRow className="Mui-focusVisible" />,
};

export const Active: Story = {
  parameters: { pseudo: { active: true } },
  render: () => <ColorRow />,
};

export const Disabled: Story = {
  render: () => <ColorRow disabled />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  name: 'Hover + Focus',
  parameters: { pseudo: { hover: true, focusVisible: true } },
  render: () => <ColorRow className="Mui-focusVisible" />,
};

export const HoverActive: Story = {
  name: 'Hover + Active',
  parameters: { pseudo: { hover: true, active: true } },
  render: () => <ColorRow />,
};

export const ActiveFocus: Story = {
  name: 'Active + Focus',
  parameters: { pseudo: { active: true, focusVisible: true } },
  render: () => <ColorRow className="Mui-focusVisible" />,
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <Stack spacing={0}>
      {/* column headers */}
      <Stack direction="row">
        <Box sx={{ width: 72, flexShrink: 0 }} />
        {ICON_COLORS.map((c) => (
          <Box key={c} sx={{ width: 64, pl: PAD }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{c}</Typography>
          </Box>
        ))}
      </Stack>

      {(['small', 'medium', 'large'] as const).map((size) => (
        <Stack key={size} direction="row" alignItems="center">
          <Box sx={{ width: 72, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">{size}</Typography>
          </Box>
          {ICON_COLORS.map((color) => (
            <Box key={color} sx={{ width: 64, p: PAD }}>
              <IconButton color={color} size={size}><MenuIcon /></IconButton>
            </Box>
          ))}
        </Stack>
      ))}
    </Stack>
  ),
};
