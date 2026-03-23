import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Skeleton, Stack, Box } from '@pulsedesk/ui';

const meta: Meta<typeof Skeleton> = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Skeleton

A placeholder shape that mimics the layout of content while it loads. It prevents layout shift and signals progress without a spinner, keeping the interface calm and predictable during data fetches.

---

### Why this component exists

Trading dashboards load multiple asynchronous data sources — positions, watchlist prices, order history. Showing blank panels or spinners degrades the experience and causes jarring reflows when data arrives. Skeletons pre-allocate the exact space each piece of content will occupy, so the layout is stable from the first render.

---

### Variants

| Variant | Shape | Use for |
|---|---|---|
| **text** (default) | Single line, pill-rounded ends | Text labels, single values |
| **rectangular** | Hard corners | Cards, panels, images |
| **rounded** | Soft corners | Chips, avatar backgrounds, rounded cards |
| **circular** | Circle | Avatars, icon placeholders |

---

### Sizing

Always match the Skeleton dimensions to the content it replaces:
- Use the same \`width\` and \`height\` as the real element.
- For text, omit \`height\` — it defaults to \`1em\` matching the current font size.
- For tables, repeat the row pattern (see \`LoadingTable\` story).

---

### Animation

The default \`animation="pulse"\` is a slow fade in/out. Use \`animation="wave"\` for a shimmer effect, or \`animation={false}\` to disable animation in reduced-motion contexts (the design system handles this via \`prefers-reduced-motion\` automatically).

---

### Do / Don't

- ✅ Match the skeleton shape exactly to the content it replaces to eliminate layout shift.
- ✅ Use \`LoadingTable\` pattern for tabular data — repeated rows of skeletons.
- ❌ Do not show Skeletons for instant operations (< 100 ms) — it adds perceived latency.
- ❌ Do not mix Skeletons and spinners for the same loading context.
        `,
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  render: () => <Skeleton width={200} height={28} />,
};

export const LoadingTable: Story = {
  render: () => (
    <Stack spacing={1} sx={{ maxWidth: 480 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Stack key={i} direction="row" spacing={2}>
          <Skeleton width={80} />
          <Skeleton width={120} />
          <Skeleton width={60} />
          <Skeleton width={100} />
        </Stack>
      ))}
    </Stack>
  ),
};

export const Variants: Story = {
  render: () => (
    <Stack spacing={2}>
      <Skeleton variant="text" width={300} />
      <Skeleton variant="rectangular" width={300} height={60} />
      <Skeleton variant="rounded" width={300} height={60} />
      <Skeleton variant="circular" width={40} height={40} />
    </Stack>
  ),
};
