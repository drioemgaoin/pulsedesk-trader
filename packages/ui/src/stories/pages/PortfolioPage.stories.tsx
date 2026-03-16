import type { Meta, StoryObj } from '@storybook/react';
import PortfolioPage from '../../../../apps/portfolio-mfe/src/PortfolioPage';
import { defaultHandlers, emptyOrderHandlers } from '../fixtures/handlers';

const meta: Meta<typeof PortfolioPage> = {
  title: 'Pages/PortfolioPage',
  component: PortfolioPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: defaultHandlers },
  },
};
export default meta;
type Story = StoryObj<typeof PortfolioPage>;

/** Portfolio with P&L banner, sparklines, and positions table. */
export const Default: Story = {};

/** Empty portfolio — shows "No open positions" empty state with CTA. */
export const Empty: Story = {
  parameters: {
    msw: { handlers: emptyOrderHandlers },
  },
};
