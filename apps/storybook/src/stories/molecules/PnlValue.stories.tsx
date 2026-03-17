import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PnlValue } from '@pulsedesk/ui';
import { Stack, Typography } from '@pulsedesk/ui';

const meta: Meta<typeof PnlValue> = {
  title: 'Molecules/PnlValue',
  component: PnlValue,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
## PnlValue

Displays an unrealized profit/loss value with its percentage return, color-coded green for positive and red for negative. It is the standard way to render P&L anywhere in the platform.

---

### Why this component exists

P&L is the most emotionally loaded number on a trading screen. Users need to read it in milliseconds. PnlValue enforces three rules that make this consistent everywhere:

1. **Color** — green for positive, red for negative, muted grey for zero. No exceptions.
2. **Format** — always shows both the absolute value (currency) and the percentage return side by side.
3. **Sign** — positive values always show \`+\`, negative always show \`−\`. Zero shows neither.

Without a shared component these rules would be re-implemented (and occasionally broken) in every table, panel, and tooltip.

---

### Props

- **value** — absolute P&L in the account's base currency (positive or negative float)
- **pct** — percentage return (positive or negative float, e.g. \`2.3\` for +2.3%)
- **variant** — Typography variant controlling the text size. Match to the surrounding context.

---

### Typography variants by context

| Context | Recommended variant |
|---|---|
| Portfolio summary header | \`h6\` or \`subtitle1\` |
| Position table row | \`body2\` |
| Order detail panel | \`body1\` |
| Compact ticker / tooltip | \`caption\` |

---

### Color rules

| Condition | Color |
|---|---|
| value > 0 | \`success.main\` (green) |
| value < 0 | \`error.main\` (red) |
| value === 0 | \`text.secondary\` (muted) |

---

### Do / Don't

- ✅ Always use PnlValue for P&L — never render raw colored numbers inline.
- ✅ Use the \`variant\` prop to control size — do not wrap in a Typography with different styles.
- ❌ Do not show only the percentage or only the absolute value — always show both for clarity.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['caption', 'body2', 'body1', 'subtitle2', 'subtitle1', 'h6'] },
  },
};
export default meta;
type Story = StoryObj<typeof PnlValue>;

export const Positive: Story = {
  render: () => <PnlValue value={1234.56} pct={2.3} />,
};

export const Negative: Story = {
  render: () => <PnlValue value={-500} pct={-1.1} />,
};

export const ZeroPnl: Story = {
  name: 'Zero P&L',
  render: () => <PnlValue value={0} pct={0} />,
};

export const AllVariants: Story = {
  name: 'Typography variants',
  render: () => (
    <Stack spacing={2}>
      {(['caption', 'body2', 'body1', 'subtitle2', 'subtitle1', 'h6'] as const).map((v) => (
        <Stack key={v} direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ width: 72, flexShrink: 0 }}>{v}</Typography>
          <PnlValue value={1234.56} pct={2.3} variant={v} />
        </Stack>
      ))}
    </Stack>
  ),
};
