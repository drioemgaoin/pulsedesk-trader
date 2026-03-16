import type { Meta, StoryObj } from '@storybook/react';
import { SimulatorPage } from '@pulsedesk/simulator-mfe';

const meta: Meta<typeof SimulatorPage> = {
  title: 'Pages/SimulatorPage',
  component: SimulatorPage,
  tags: [],
  render: () => (
    <div style={{ height: '100vh' }}>
      <SimulatorPage />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;
type Story = StoryObj<typeof SimulatorPage>;

export const Default: Story = {
  name: 'Load Simulator — Idle',
};

export const WithRateLimitWarning: Story = {
  name: 'Load Simulator — Rate Limit Warning',
};
