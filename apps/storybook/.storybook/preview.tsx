import React from 'react';
import type { Preview, Decorator } from '@storybook/react';
import { DocsContainer } from '@storybook/blocks';
import { create as sbTheme } from '@storybook/theming/create';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { Transition } from 'react-transition-group';
import { ThemeProvider, CssBaseline, createAppTheme } from '@pulsedesk/ui';
import { withProviders } from '../src/decorators/withProviders';
import { defaultHandlers } from '../src/fixtures/handlers';
import '@pulsedesk/ui/tokens.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';

// ── React 19 + react-transition-group v4 compatibility patch ─────────────────
// Storybook docs mode wraps each story canvas in a React Activity component.
// When a story scrolls into view, Activity fires reappearLayoutEffects, which
// calls componentDidMount() again on all class components. Transition stores
// appearStatus = ENTERING in its constructor when in=true + appear=true. When
// componentDidMount re-fires during reappear, it calls onEnter(nodeRef.current),
// but nodeRef.current is null (cleared by disappearLayoutEffects), causing:
//   TypeError: Cannot read properties of null (reading 'scrollTop')
//
// Fix: if nodeRef is provided and .current is null when componentDidMount fires,
// clear appearStatus so updateStatus(true, null) becomes a no-op, preventing the
// enter animation attempt. On normal first mount the ref is always set, so this
// guard only fires during the Activity reappear cycle.
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = Transition.prototype as any;
  const original: () => void = proto.componentDidMount;
  proto.componentDidMount = function (this: {
    props: { nodeRef?: { current: unknown } | null };
    appearStatus: unknown;
  }) {
    if (this.props.nodeRef != null && this.props.nodeRef.current == null) {
      this.appearStatus = null;
    }
    original.call(this);
  };
}

// Pass defaultHandlers as *initial* handlers to setupWorker().
// Initial handlers survive worker.resetHandlers() — only override handlers (added via worker.use())
// are cleared. This is critical for Docs mode: multiple stories render simultaneously and each
// story's mswLoader calls resetHandlers() before setting its own handlers, which would wipe
// another story's handlers. With initial handlers baked in, the baseline is always active.
initialize({ onUnhandledRequest: 'warn' }, defaultHandlers);

// ── MUI themes (canvas / story rendering) ────────────────────────────────────

const darkTheme  = createAppTheme('dark');
const lightTheme = createAppTheme('light');
const toMode = (value: unknown): 'dark' | 'light' =>
  value === 'light' ? 'light' : 'dark';

// ── Storybook docs themes (Docs page prose, args tables, story headers) ───────
// These style the DocsContainer wrapper — separate from the MUI theme used by
// component canvases. Both must switch together when the toolbar is toggled.

const brand = {
  brandTitle: 'PulseDesk UI',
  fontBase: '"Inter", system-ui, sans-serif',
  fontCode: '"JetBrains Mono", monospace',
};

const sbDark = sbTheme({
  base: 'dark',
  ...brand,
  colorPrimary:   '#f59e0b',
  colorSecondary: '#f59e0b',
  appBg:          '#1a1a1f',
  appContentBg:   '#16161b',
  appBorderColor: '#2a2a35',
  barBg:          '#16161b',
  barSelectedColor: '#f59e0b',
  inputBg:          '#22222a',
  inputBorder:      '#2a2a35',
  inputTextColor:   '#e0e0e8',
  textColor:        '#c8c8d4',
  textMutedColor:   '#70708080',
});

const sbLight = sbTheme({
  base: 'light',
  ...brand,
  colorPrimary:   '#d97706',
  colorSecondary: '#d97706',
  appBg:          '#f0f0f5',
  appContentBg:   '#ffffff',
  appBorderColor: '#dddde8',
  barBg:          '#ffffff',
  barSelectedColor: '#d97706',
  inputBg:          '#ffffff',
  inputBorder:      '#d0d0db',
  inputTextColor:   '#1a1a2e',
  textColor:        '#1a1a2e',
  textMutedColor:   '#66667780',
});

// ── Themed docs container ─────────────────────────────────────────────────────
// DocsContainer renders outside the decorator chain, so Storybook hooks like
// useGlobals are not available here. Instead, withTheme dispatches a custom
// window event ('pd:theme') whenever the toolbar mode changes, and a module-level
// variable seeds the initial value so the container starts in the right mode.

let previewMode: 'dark' | 'light' = 'dark';

function ThemedDocsContainer(props: React.ComponentProps<typeof DocsContainer>) {
  const [mode, setMode] = React.useState<'dark' | 'light'>(previewMode);
  React.useEffect(() => {
    const handler = (e: Event) => setMode((e as CustomEvent<'dark' | 'light'>).detail);
    window.addEventListener('pd:theme', handler);
    return () => window.removeEventListener('pd:theme', handler);
  }, []);
  return <DocsContainer {...props} theme={mode === 'light' ? sbLight : sbDark} />;
}

// ── Canvas theme decorator ────────────────────────────────────────────────────

const withTheme: Decorator = (Story, context) => {
  const mode = toMode(context.globals?.['colorMode']);
  const theme = mode === 'light' ? lightTheme : darkTheme;

  // Notify ThemedDocsContainer (which lives outside the decorator chain) so the
  // Docs page prose, args table, and section headers switch in sync.
  previewMode = mode;
  window.dispatchEvent(new CustomEvent('pd:theme', { detail: mode }));

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
      {/*
       * Inject themeMode so any component that reflects the current mode
       * (e.g. NavBar's sun/moon toggle icon) automatically matches the
       * toolbar selection — no need to hardcode it in individual story args.
       */}
      <Story args={{ themeMode: mode }} />
    </ThemeProvider>
  );
};

// ── Preview config ────────────────────────────────────────────────────────────

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
    docs: {
      // ThemedDocsContainer wraps the entire Docs page and switches theme
      // in sync with the toolbar — title, prose, args table, story headers.
      container: ThemedDocsContainer,
    },
    // No global msw.handlers here — defaultHandlers are baked into the worker as initial handlers
    // (see initialize() call above). Stories that need different data set parameters.msw.handlers
    // themselves, which calls worker.use() as an override on top of the initial handlers.
  },
};

export default preview;
