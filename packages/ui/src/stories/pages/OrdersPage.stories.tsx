import type { Meta, StoryObj } from '@storybook/react';
import OrdersPage from '../../../../apps/orders-mfe/src/OrdersPage';
import { defaultHandlers, emptyOrderHandlers } from '../fixtures/handlers';

const meta: Meta<typeof OrdersPage> = {
  title: 'Pages/OrdersPage',
  component: OrdersPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: defaultHandlers },
  },
};
export default meta;
type Story = StoryObj<typeof OrdersPage>;

/** Populated orders table with filters, pagination, and cancel buttons. */
export const Default: Story = {};

/** Empty state — shows "No orders match the current filters." */
export const Empty: Story = {
  parameters: {
    msw: { handlers: emptyOrderHandlers },
  },
};
