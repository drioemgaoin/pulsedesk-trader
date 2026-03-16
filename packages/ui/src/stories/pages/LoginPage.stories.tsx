import type { Meta, StoryObj } from '@storybook/react';
import LoginPage from '../../../../apps/trader-ui/src/pages/LoginPage';
import { defaultHandlers } from '../fixtures/handlers';

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/LoginPage',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: defaultHandlers },
  },
};
export default meta;
type Story = StoryObj<typeof LoginPage>;

/** Default sign-in form — submit to trigger the MSW-mocked auth handler. */
export const Default: Story = {};
