import type { Meta, StoryObj } from '@storybook/react';
import { RowDetail } from '@pulsedesk/orders-mfe';
import type { OrderResponseV1 } from '@pulsedesk/orders-mfe';

const BASE_ORDER: OrderResponseV1 = {
  id: 'ord-00000001-0000-0000-0000-000000000001',
  commandId: 'cmd-00000001-0000-0000-0000-000000000001',
  accountId: 'trader',
  symbol: 'AAPL',
  side: 'BUY',
  type: 'LIMIT',
  quantity: 100,
  limitPrice: 189.5,
  status: 'FILLED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  rejectionReason: null,
};

const meta: Meta<typeof RowDetail> = {
  title: 'Molecules/RowDetail',
  component: RowDetail,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof RowDetail>;

export const Filled: Story = {
  name: 'Filled order',
  args: { order: BASE_ORDER },
};

export const WithRejectionReason: Story = {
  name: 'Rejected — with reason',
  args: {
    order: {
      ...BASE_ORDER,
      status: 'REJECTED',
      limitPrice: null,
      rejectionReason: 'Insufficient buying power',
    },
  },
};

export const MarketOrder: Story = {
  name: 'Market order (no limit price)',
  args: {
    order: {
      ...BASE_ORDER,
      type: 'MARKET',
      limitPrice: null,
    },
  },
};
