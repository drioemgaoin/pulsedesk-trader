import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Typography, Stack, Box } from '@pulsedesk/ui';

const meta: Meta<typeof Typography> = {
  title: 'Atoms/Typography',
  component: Typography,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Typography

The text rendering primitive that enforces the platform's type scale, color palette, and font choices. Every piece of text in the application — headings, labels, prices, captions — uses Typography to stay consistent.

---

### Why this component exists

Trading UIs are data-dense. A consistent type scale creates visual hierarchy that lets users scan panels in milliseconds: large values stand out from their labels, table headers are clearly distinct from cell data, captions fade into the background. Without a shared Typography component, ad-hoc font sizes and weights erode this hierarchy over time.

---

### Type scale

| Variant | Role | Typical use |
|---|---|---|
| **h1–h3** | Large headings | Page titles, login screen |
| **h4–h6** | Section headings | Panel headers, modal titles |
| **subtitle1** | Large sub-label | Section subtitle, key metric label |
| **subtitle2** | Small sub-label | Table section grouping |
| **body1** | Primary body | Panel content, order details |
| **body2** | Secondary body | Table rows, form field values |
| **caption** | Small metadata | Timestamps, tooltips, helper text |
| **overline** | Uppercase label | Column headers, category tags |

---

### Semantic colors

Always use semantic color tokens rather than hard-coded hex values:

| Color | Use |
|---|---|
| \`text.primary\` | Main content, values |
| \`text.secondary\` | Labels, captions, metadata |
| \`text.disabled\` | Inactive or unavailable text |
| \`success.main\` | Positive P&L, uptick values |
| \`error.main\` | Negative P&L, downtick values |
| \`primary.main\` | Brand highlight, active state |

---

### Monospace numbers

For prices, quantities, and any aligned numeric data, apply \`sx={{ fontFamily: 'monospace' }}\`. Monospace ensures digits are the same width so numbers align correctly in tables even as values change in real time.

---

### Do / Don't

- ✅ Always use a variant from the type scale — never set raw \`fontSize\` or \`fontWeight\` inline.
- ✅ Use \`color="text.secondary"\` for labels and captions — full-contrast text everywhere creates visual noise.
- ✅ Use monospace for all numeric values in tables and tickers.
- ❌ Do not use \`h1\` or \`h2\` inside panels — reserve large headings for page-level titles.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Typography>;

export const Default: Story = {
  args: { children: 'The quick brown fox jumps over the lazy dog.' },
};

export const TypeScale: Story = {
  render: () => (
    <Stack spacing={1}>
      {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'overline'] as const).map(
        (variant) => (
          <Typography key={variant} variant={variant}>
            {variant} — The quick brown fox
          </Typography>
        ),
      )}
    </Stack>
  ),
};

export const Colors: Story = {
  render: () => (
    <Stack spacing={1}>
      <Typography color="text.primary">text.primary</Typography>
      <Typography color="text.secondary">text.secondary</Typography>
      <Typography color="text.disabled">text.disabled</Typography>
      <Typography color="primary.main">primary.main</Typography>
      <Typography color="success.main">success.main (uptick)</Typography>
      <Typography color="error.main">error.main (downtick)</Typography>
    </Stack>
  ),
};

export const Monospace: Story = {
  render: () => (
    <Box>
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
        ord-00000001-0001-0001 · 178.32 · BUY × 100
      </Typography>
    </Box>
  ),
};
