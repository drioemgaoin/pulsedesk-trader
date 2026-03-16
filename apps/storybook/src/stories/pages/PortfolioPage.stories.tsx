import type { Meta, StoryObj } from '@storybook/react';
import { PortfolioPage } from '@pulsedesk/portfolio-mfe';
import { emptyOrderHandlers } from '../../fixtures/handlers';

const meta: Meta<typeof PortfolioPage> = {
  title: 'Pages/PortfolioPage',
  component: PortfolioPage,
  tags: [],
  render: () => (
    <div style={{ height: '100vh' }}>
      <PortfolioPage />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;
type Story = StoryObj<typeof PortfolioPage>;

export const Default: Story = {
  name: 'Portfolio — With Positions',
};

export const EmptyState: Story = {
  name: 'Portfolio — No Positions',
  parameters: {
    msw: { handlers: emptyOrderHandlers },
  },
};
