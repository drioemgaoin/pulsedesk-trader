import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

// ── PulseDesk manager themes ───────────────────────────────────────────────────
// These style the Storybook shell (sidebar, toolbar, panels), not the canvas.
// They switch automatically when the "Theme" toolbar button is toggled.

const brand = {
  brandTitle: 'PulseDesk UI',
  fontBase: '"Inter", system-ui, sans-serif',
  fontCode: '"JetBrains Mono", monospace',
};

const darkTheme = create({
  base: 'dark',
  ...brand,

  // Accent — amber, matching --pd-accent-primary
  colorPrimary:   '#f59e0b',
  colorSecondary: '#f59e0b',

  // Shell backgrounds
  appBg:         '#1a1a1f',
  appContentBg:  '#16161b',
  appPreviewBg:  '#16161b',
  appBorderColor: '#2a2a35',
  appBorderRadius: 6,

  // Navigation bar
  barBg:           '#16161b',
  barTextColor:    '#9090a0',
  barHoverColor:   '#e0e0e8',
  barSelectedColor: '#f59e0b',

  // Inputs (search, controls)
  inputBg:          '#22222a',
  inputBorder:      '#2a2a35',
  inputTextColor:   '#e0e0e8',
  inputBorderRadius: 4,

  // Text
  textColor:       '#c8c8d4',
  textMutedColor:  '#70708080',
  textInverseColor: '#ffffff',
});

const lightTheme = create({
  base: 'light',
  ...brand,

  colorPrimary:   '#d97706',
  colorSecondary: '#d97706',

  appBg:          '#f0f0f5',
  appContentBg:   '#ffffff',
  appPreviewBg:   '#f8f8fc',
  appBorderColor: '#dddde8',
  appBorderRadius: 6,

  barBg:           '#ffffff',
  barTextColor:    '#55556a',
  barHoverColor:   '#1a1a2e',
  barSelectedColor: '#d97706',

  inputBg:          '#ffffff',
  inputBorder:      '#d0d0db',
  inputTextColor:   '#1a1a2e',
  inputBorderRadius: 4,

  textColor:       '#1a1a2e',
  textMutedColor:  '#66667780',
  textInverseColor: '#ffffff',
});

// ── Apply initial theme ────────────────────────────────────────────────────────

addons.setConfig({ theme: darkTheme });

// ── Sync with the preview toolbar toggle ──────────────────────────────────────
// When the developer clicks "Theme → Light / Dark" in the canvas toolbar,
// the manager shell switches to match — sidebar, panels, and toolbar all update.

addons.getChannel().on('GLOBALS_UPDATED', ({ globals }: { globals: Record<string, unknown> }) => {
  const isDark = globals?.['colorMode'] !== 'light';
  addons.setConfig({ theme: isDark ? darkTheme : lightTheme });
});
