import path from 'path';
import type { StorybookConfig } from '@storybook/react-vite';

// Workspace root — two levels up from apps/storybook/.storybook/
const WS = path.resolve(__dirname, '../../../');
const STORYBOOK_STREAM_MOCK = path.join(WS, 'apps/storybook/src/mocks/useMarketStream.ts');

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'msw-storybook-addon',
    'storybook-addon-pseudo-states',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: ['../public'],
  docs: { autodocs: 'tag' },

  viteFinal: async (config) => {
    config.resolve ??= {};
    const existingAlias = config.resolve.alias;
    const normalizedAlias = Array.isArray(existingAlias)
      ? existingAlias
      : Object.entries((existingAlias as Record<string, string> | undefined) ?? {}).map(
          ([find, replacement]) => ({ find, replacement }),
        );

    const tradingHook = path.join(WS, 'apps/trading-mfe/src/hooks/useMarketStream');
    const portfolioHook = path.join(WS, 'apps/portfolio-mfe/src/hooks/useMarketStream');

    config.resolve.alias = [
      ...normalizedAlias,
      // Stub the WebSocket market stream in Storybook only.
      // Keep both absolute and relative matches because Vite can resolve ids in either form.
      { find: `${tradingHook}.ts`, replacement: STORYBOOK_STREAM_MOCK },
      { find: tradingHook, replacement: STORYBOOK_STREAM_MOCK },
      { find: `${portfolioHook}.ts`, replacement: STORYBOOK_STREAM_MOCK },
      { find: portfolioHook, replacement: STORYBOOK_STREAM_MOCK },
      { find: './hooks/useMarketStream', replacement: STORYBOOK_STREAM_MOCK },
    ];
    return config;
  },
};

export default config;
