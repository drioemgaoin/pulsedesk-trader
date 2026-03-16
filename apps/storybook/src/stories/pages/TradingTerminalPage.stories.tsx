import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { TradingTerminalPage } from "@pulsedesk/trading-mfe";
import { defaultHandlers } from "../../fixtures/handlers";
import { MOCK_ACCOUNT_ID, MOCK_AS_OF } from "../../fixtures/data";

const API_V1 = "*/api/v1";
const emptyBlotterHandlers = [
  http.get(`${API_V1}/orders`, () =>
    HttpResponse.json({
      orders: [],
      pagination: { limit: 25, offset: 0, total: 0 },
    }),
  ),
  http.get(`${API_V1}/positions`, () =>
    HttpResponse.json({
      accountId: MOCK_ACCOUNT_ID,
      positions: [],
      totalUnrealizedPnl: 0,
      asOf: MOCK_AS_OF,
    }),
  ),
];

const meta: Meta<typeof TradingTerminalPage> = {
  title: "Pages/TradingTerminalPage",
  component: TradingTerminalPage,
  tags: [],
  render: () => (
    <div style={{ height: "100vh" }}>
      <TradingTerminalPage />
    </div>
  ),
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;
type Story = StoryObj<typeof TradingTerminalPage>;

/**
 * The WS stub (aliased via viteFinal) returns 'connected' status with static tick data.
 * MSW intercepts all HTTP calls (watchlist, orders, positions).
 */
export const Default: Story = {
  name: "Trading Terminal",
  parameters: {
    msw: { handlers: defaultHandlers },
  },
};

/** Empty blotter — shows the "No orders" empty state in the bottom panel. */
export const EmptyBlotter: Story = {
  parameters: {
    msw: { handlers: emptyBlotterHandlers },
  },
};
