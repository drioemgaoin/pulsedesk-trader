import type { Meta, StoryObj } from '@storybook/react';
import { LiveBadge } from '@pulsedesk/ui';

const meta: Meta<typeof LiveBadge> = {
  title: 'Atoms/LiveBadge',
  component: LiveBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof LiveBadge>;

export const Default: Story = {};

export const WithBackground: Story = {
  render: () => (
    <div style={{ background: 'var(--pd-bg-canvas)', padding: '8px 12px', borderRadius: 4 }}>
      <LiveBadge />
    </div>
  ),
};
