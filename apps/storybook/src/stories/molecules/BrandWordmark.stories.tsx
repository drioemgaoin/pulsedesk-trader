import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { BrandWordmark } from '@pulsedesk/ui';
import { Box, Stack, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof BrandWordmark> = {
  title: 'Molecules/BrandWordmark',
  component: BrandWordmark,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
## BrandWordmark

The PulseDesk logotype — the product name rendered in the brand typeface and color. It appears in two contexts: the compact \`sm\` size in the navigation bar, and the large \`lg\` size on the login page.

---

### Why this component exists

The wordmark is not just text — it is the brand identity rendered consistently. Encapsulating it as a component guarantees the typeface, weight, color, and sizing never drift across pages. A designer changing the brand font or color needs to update one component, not hunt for every occurrence in the codebase.

---

### Sizes

| Size | Context | Visual weight |
|---|---|---|
| **sm** | NavBar, top-left corner | Compact, 24px equivalent — does not compete with content |
| **lg** | Login page, centered hero | Large, prominent — brand first impression |

---

### Theming

BrandWordmark uses the active theme's primary color for its accent. It adapts automatically to dark and light mode via CSS custom properties — no prop needed.

---

### Do / Don't

- ✅ Use \`sm\` in the NavBar only — do not resize it via \`sx\`.
- ✅ Use \`lg\` on the login/splash page only.
- ❌ Do not add additional text or icons adjacent to the wordmark — it should stand alone.
- ❌ Do not hard-code colors or sizes via \`sx\` — the component handles its own styling.
        `,
      },
    },
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
  },
};
export default meta;
type Story = StoryObj<typeof BrandWordmark>;

export const Small: Story = {
  name: 'sm — nav bar size',
  render: () => <BrandWordmark size="sm" />,
};

export const Large: Story = {
  name: 'lg — login page size',
  render: () => <BrandWordmark size="lg" />,
};

export const BothSizes: Story = {
  name: 'Both sizes compared',
  render: () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>sm — nav bar</Typography>
        <BrandWordmark size="sm" />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>lg — login / hero</Typography>
        <BrandWordmark size="lg" />
      </Box>
    </Stack>
  ),
};
