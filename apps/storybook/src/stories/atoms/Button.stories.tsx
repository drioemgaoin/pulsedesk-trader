import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Button

The primary action trigger across the entire platform. Every user-initiated operation — placing an order, confirming a dialog, submitting a form — is expressed through a Button.

---

### Why this component exists

Trading interfaces demand instant recognition of action hierarchy. When a user scans a panel under pressure, they must know in one glance which button executes a trade, which one is secondary, and which one is a low-commitment option. The three-variant system (contained → outlined → text) enforces that hierarchy without requiring designers to make ad-hoc colour decisions.

---

### Variants — action hierarchy

| Variant | Role | When to use |
|---|---|---|
| **Contained** | Primary action | The single most important action on the screen. One contained button per context. e.g. *Place Order*, *Confirm*, *Save* |
| **Outlined** | Secondary action | A valid alternative that is less urgent than the primary. e.g. *Edit*, *Export*, *Preview* |
| **Text** | Tertiary / ghost | Low-commitment options, cancel paths, or inline links that warrant button semantics. e.g. *Cancel*, *Skip*, *Learn more* |

---

### Semantic colors — intent signalling

| Color | Semantic meaning | Example |
|---|---|---|
| **Primary** | Brand / neutral action | Default for most actions |
| **Success** | Confirms a positive outcome | *Confirm Buy*, *Order Filled* |
| **Error** | Destructive or irreversible action | *Cancel Order*, *Delete*, *Close Position* |
| **Warning** | Caution — action has side effects | *Force Close*, *Override* |
| **Info** | Informational or neutral follow-up | *View Details*, *Show Log* |

---

### States

- **Default** — resting appearance.
- **Hover** — subtle background shift signals interactivity before the click.
- **Focus** — keyboard-navigation ring added on top of the default appearance. No background change — focus is an *additive* indicator.
- **Active / Pressed** — visibly filled/darkened to confirm the click moment. Loading reuses this appearance.
- **Disabled** — greyed out, non-interactive. Use sparingly: prefer hiding unavailable actions over disabling them.
- **Loading** — holds the active/pressed appearance while an async operation runs. Communicates "we received your click" without a jarring layout shift.

---

### Accessibility

Buttons are \`<button>\` elements — fully keyboard navigable via Tab / Space / Enter. The focus ring is intentionally distinct from hover so keyboard users always know where focus is without a mouse. The loading state sets \`aria-busy\` automatically.

---

### Do / Don't

- ✅ One contained button per view or modal — it represents the primary intent.
- ✅ Match the semantic color to the consequence of the action, not the brand.
- ❌ Don't use a Button for navigation — use a Link or NavBar item.
- ❌ Don't disable a button to hide unavailable actions in time-sensitive UIs; show/hide instead.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

// ─── Shared constants ─────────────────────────────────────────────────────────

const VARIANTS = ['contained', 'outlined', 'text'] as const;
const COLORS   = ['primary', 'success', 'error', 'warning', 'info'] as const;

type ButtonVariant = typeof VARIANTS[number];
type ButtonColor   = typeof COLORS[number];

// ─── StateMatrix ──────────────────────────────────────────────────────────────
// Renders a variants (rows) × colors (columns) grid for a given state.
// Extra props (disabled, loading, className) are forwarded to every button.

const COL_W = 128; // button cell width — wide enough to contain the focus ring

function StateMatrix(stateProps: Omit<React.ComponentProps<typeof Button>, 'variant' | 'color' | 'children'>) {
  return (
    <Stack spacing={0}>
      {/* column headers */}
      <Stack direction="row">
        <Box sx={{ width: 96, flexShrink: 0 }} />
        {COLORS.map((color) => (
          <Box key={color} sx={{ width: COL_W, pl: '8px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {color}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* one row per variant */}
      {VARIANTS.map((variant: ButtonVariant) => (
        <Stack key={variant} direction="row" alignItems="center">
          <Box sx={{ width: 96, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {variant}
            </Typography>
          </Box>
          {COLORS.map((color: ButtonColor) => (
            // p: 1 (8px) gives the box-shadow / focus ring room on all sides
            <Box key={color} sx={{ width: COL_W, p: '8px' }}>
              <Button variant={variant} color={color} {...stateProps}>
                {color}
              </Button>
            </Box>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

// ─── State stories ────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <StateMatrix />,
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
  render: () => <StateMatrix />,
};

export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
  render: () => <StateMatrix className="Mui-focusVisible" />,
};

export const Active: Story = {
  parameters: { pseudo: { active: true } },
  render: () => <StateMatrix />,
};

export const Disabled: Story = {
  render: () => <StateMatrix disabled />,
};

export const Loading: Story = {
  render: () => <StateMatrix loading />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocus: Story = {
  name: 'Hover + Focus',
  parameters: { pseudo: { hover: true, focusVisible: true } },
  render: () => <StateMatrix className="Mui-focusVisible" />,
};

export const ActiveFocus: Story = {
  name: 'Active + Focus',
  parameters: { pseudo: { active: true, focusVisible: true } },
  render: () => <StateMatrix className="Mui-focusVisible" />,
};

export const HoverActive: Story = {
  name: 'Hover + Active',
  parameters: { pseudo: { hover: true, active: true } },
  render: () => <StateMatrix />,
};

// ─── Sizes ────────────────────────────────────────────────────────────────────
// Each size gets its own section; within each section variants are columns so
// buttons have room to breathe and large buttons never overlap.

const SIZE_COL_WIDTH: Record<string, number> = { small: 120, medium: 150, large: 185 };

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
            {VARIANTS.map((variant) => (
              <Stack key={variant} sx={{ width: SIZE_COL_WIDTH[size] }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', mb: '4px' }}>
                  {variant}
                </Typography>
                <Stack>
                  {COLORS.map((color) => (
                    <Box key={color} sx={{ p: '8px' }}>
                      <Button variant={variant} color={color} size={size} fullWidth>
                        {color}
                      </Button>
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

// ─── Full width ───────────────────────────────────────────────────────────────
// Each variant gets its own column so the fill effect is clearly visible.

export const FullWidth: Story = {
  render: () => (
    <Stack direction="row" spacing={3}>
      {VARIANTS.map((variant) => (
        <Stack key={variant} sx={{ width: 220 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'capitalize', fontWeight: 600, mb: '4px' }}
          >
            {variant}
          </Typography>
          <Stack>
            {COLORS.map((color) => (
              <Box key={color} sx={{ p: '8px' }}>
                <Button variant={variant} color={color} fullWidth>
                  {color}
                </Button>
              </Box>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  ),
};
