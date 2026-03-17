import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TextField, Stack, Box, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof TextField> = {
  title: 'Atoms/TextField',
  component: TextField,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## TextField

The standard single-line text input used across all forms and filter panels. Every place where a user types a value — symbol search, price entry, date range — uses TextField.

---

### Why this component exists

Consistent input styling is critical in a trading interface where users switch rapidly between fields under time pressure. A single TextField component guarantees that every input has the same focus ring, label behaviour, error state, and keyboard semantics, so users always know they are interacting with an editable field.

---

### Variants

| Variant | Style | When to use |
|---|---|---|
| **outlined** (default) | Bordered box | Forms, standalone filter fields |
| **filled** | Background fill, underline | Dense panels where horizontal space is constrained |
| **standard** | Underline only | Inline editing, minimal aesthetic |

Stick to **outlined** for all standard form use. The other variants exist for specific layout needs.

---

### States

- **Default** — resting, empty or pre-filled.
- **Focused** — blue border and floating label indicate active editing.
- **Hover** — border darkens slightly on mouse-over to signal interactivity.
- **Error** — red border + helper text below. Use when validation fails.
- **Disabled** — greyed out, non-editable. Use for read-only fields in context.

---

### Accessibility

TextField renders a \`<label>\` linked to its \`<input>\` via \`id\`. Screen readers announce the label on focus. Always provide a \`label\` prop — never rely on \`placeholder\` alone, as placeholder disappears when the user types.

---

### Do / Don't

- ✅ Always set \`label\` — it is the accessible name and provides a persistent description.
- ✅ Use \`helperText\` to provide format hints (e.g. "YYYY-MM-DD") and error messages.
- ✅ Use \`error + helperText\` together — the error prop changes color, helperText explains why.
- ❌ Do not use placeholder as the only label — it disappears when the user starts typing.
- ❌ Do not disable a TextField to make it read-only — use \`InputProps={{ readOnly: true }}\` instead so keyboard users can still read the value.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TextField>;

// ─── Shared constants ─────────────────────────────────────────────────────────

const VARIANTS = ['outlined', 'filled', 'standard'] as const;
type FieldVariant = typeof VARIANTS[number];

const COL_W = 220;

// ─── StateMatrix ──────────────────────────────────────────────────────────────
// Renders all 3 variants as columns for a given state.
// Pass stateProps (focused, error, disabled, etc.) to apply the state to every variant.

function StateMatrix(stateProps: Omit<React.ComponentProps<typeof TextField>, 'variant' | 'label'>) {
  return (
    <Stack spacing={0}>
      {/* column headers */}
      <Stack direction="row">
        <Box sx={{ width: 96, flexShrink: 0 }} />
        {VARIANTS.map((v) => (
          <Box key={v} sx={{ width: COL_W, pl: '8px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{v}</Typography>
          </Box>
        ))}
      </Stack>

      {/* one column per variant */}
      <Stack direction="row" alignItems="flex-start">
        <Box sx={{ width: 96, flexShrink: 0 }} />
        {VARIANTS.map((v: FieldVariant) => (
          <Box key={v} sx={{ width: COL_W, p: '8px' }}>
            <TextField variant={v} label={v} {...stateProps} />
          </Box>
        ))}
      </Stack>
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

/** MUI TextField focused state: uses \`focused\` prop + focusWithin pseudo-state on the wrapper */
export const Focused: Story = {
  parameters: { pseudo: { focusWithin: true, focusVisible: true } },
  render: () => <StateMatrix focused />,
};

export const Error: Story = {
  render: () => <StateMatrix error helperText="This field is required" />,
};

export const Disabled: Story = {
  render: () => <StateMatrix disabled defaultValue="Can't edit this" />,
};

// ─── State combinations ───────────────────────────────────────────────────────

export const HoverFocused: Story = {
  name: 'Hover + Focused',
  parameters: { pseudo: { hover: true, focusWithin: true } },
  render: () => <StateMatrix focused />,
};

export const HoverError: Story = {
  name: 'Hover + Error',
  parameters: { pseudo: { hover: true } },
  render: () => <StateMatrix error helperText="Required" />,
};

// ─── Sizes ────────────────────────────────────────────────────────────────────
// defaultValue is passed so the label is always floating — without a value the
// label sits inside the input as a placeholder, which hides the height difference
// between sizes. Floating labels let the input height speak for itself.

export const Sizes: Story = {
  render: () => (
    <Stack spacing={3}>
      {(['small', 'medium', 'large'] as const).map((size) => (
        <Box key={size}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', textTransform: 'capitalize' }}>{size}</Typography>
          <StateMatrix size={size} defaultValue="value" />
        </Box>
      ))}
    </Stack>
  ),
};

// ─── Password ─────────────────────────────────────────────────────────────────

export const PasswordField: Story = {
  parameters: { pseudo: { focusWithin: true } },
  render: () => <StateMatrix type="password" defaultValue="password123" focused />,
};
