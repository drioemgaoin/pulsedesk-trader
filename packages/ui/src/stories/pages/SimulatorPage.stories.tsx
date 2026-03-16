import type { Meta, StoryObj } from '@storybook/react';
import SimulatorPage from '../../../../apps/simulator-mfe/src/SimulatorPage';
import { defaultHandlers } from '../fixtures/handlers';

const meta: Meta<typeof SimulatorPage> = {
  title: 'Pages/SimulatorPage',
  component: SimulatorPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: defaultHandlers },
  },
};
export default meta;
type Story = StoryObj<typeof SimulatorPage>;

/** Load simulator with config panel, live stats, and feed. */
export const Default: Story = {};
