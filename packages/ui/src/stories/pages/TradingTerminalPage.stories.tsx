import type { Meta, StoryObj } from '@storybook/react';
import TradingTerminalPage from '../../../../apps/trading-mfe/src/TradingTerminalPage';
import { defaultHandlers, emptyOrderHandlers } from '../fixtures/handlers';

const meta: Meta<typeof TradingTerminalPage> = {
  title: 'Pages/TradingTerminalPage',
  component: TradingTerminalPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: defaultHandlers },
  },
};
export default meta;
type Story = StoryObj<typeof TradingTerminalPage>;

/** Full terminal with populated watchlist, chart, blotter, and positions. */
export const Default: Story = {};

/** Empty blotter — shows the "No orders" empty state in the bottom panel. */
export const EmptyBlotter: Story = {
  parameters: {
    msw: { handlers: [...defaultHandlers, ...emptyOrderHandlers] },
  },
};
