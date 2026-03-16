import React from 'react';
import type { Preview, Decorator } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { ThemeProvider, CssBaseline, createAppTheme } from '@pulsedesk/ui';
import { withProviders } from '../src/decorators/withProviders';
import { defaultHandlers } from '../src/fixtures/handlers';
import '@pulsedesk/ui/tokens.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';

// Pass defaultHandlers as *initial* handlers to setupWorker().
// Initial handlers survive worker.resetHandlers() — only override handlers (added via worker.use())
// are cleared. This is critical for Docs mode: multiple stories render simultaneously and each
// story's mswLoader calls resetHandlers() before setting its own handlers, which would wipe
// another story's handlers. With initial handlers baked in, the baseline is always active.
initialize({ onUnhandledRequest: 'warn' }, defaultHandlers);

const darkTheme  = createAppTheme('dark');
const lightTheme = createAppTheme('light');
const toMode = (value: unknown): 'dark' | 'light' =>
  value === 'light' ? 'light' : 'dark';

const withTheme: Decorator = (Story, context) => {
  const mode = toMode(context.globals?.['colorMode']);
  const theme = mode === 'light' ? lightTheme : darkTheme;

  // Set data-theme synchronously so CSS custom properties (--pd-bg-canvas, etc.) are
  // available on the very first render — components that use var(--pd-*) must not see
  // an undefined variable on mount.
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.backgroundColor = theme.palette.background.default;
  document.body.style.backgroundColor = theme.palette.background.default;

  // Also keep the effect for cleanup and mode-switch updates (portals live outside the
  // React tree and need the attribute on <html>).
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.backgroundColor = theme.palette.background.default;
    document.body.style.backgroundColor = theme.palette.background.default;
    return () => {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, [mode, theme.palette.background.default]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Story />
    </ThemeProvider>
  );
};

const preview: Preview = {
  globalTypes: {
    colorMode: {
      description: 'Global theme',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'dark',  title: 'Dark',  icon: 'moon' },
          { value: 'light', title: 'Light', icon: 'sun'  },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withProviders, withTheme],
  loaders:    [mswLoader],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // No global msw.handlers here — defaultHandlers are baked into the worker as initial handlers
    // (see initialize() call above). Stories that need different data set parameters.msw.handlers
    // themselves, which calls worker.use() as an override on top of the initial handlers.
  },
};

export default preview;
