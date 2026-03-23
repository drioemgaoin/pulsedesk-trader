import type { Meta, StoryObj } from '@storybook/react';
import { OrdersPage } from '@pulsedesk/orders-mfe';
import { defaultHandlers, emptyOrderHandlers } from '../../fixtures/handlers';

const meta: Meta<typeof OrdersPage> = {
  title: 'Pages/OrdersPage',
  component: OrdersPage,
  render: () => (
    <div style={{ height: '100vh' }}>
      <OrdersPage />
    </div>
  ),
  // No 'autodocs': page stories have no props to document and require MSW isolation
  // per story. Storybook Docs mode renders all stories in one page (one service worker),
  // so per-story handler overrides bleed across stories. Canvas mode gives each story
  // its own iframe with full MSW isolation — use individual story links instead.
  tags: [],
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;
type Story = StoryObj<typeof OrdersPage>;

export const Default: Story = {
  name: 'Orders — With Data',
  parameters: {
    msw: { handlers: defaultHandlers },
  },
};

export const EmptyState: Story = {
  name: 'Orders — Empty State',
  parameters: {
    msw: { handlers: [...defaultHandlers, ...emptyOrderHandlers] },
  },
};
