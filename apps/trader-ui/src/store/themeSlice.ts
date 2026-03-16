/**
 * themeSlice — theme mode state + HTML attribute sync
 *
 * Adding a new theme:
 *   1. Add a [data-theme="your-name"] block to tokens.css
 *   2. Add "your-name" to THEME_MODES below
 *   That's it — no component code changes needed.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PaletteMode } from '@pulsedesk/ui';

const STORAGE_KEY = 'pulsedesk-theme';

/** All available themes. Extend this array to add new themes. */
export const THEME_MODES = ['dark', 'light'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

function loadMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored && (THEME_MODES as readonly string[]).includes(stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return 'dark';
}

/**
 * Syncs the data-theme attribute on <html> so CSS custom properties
 * in tokens.css activate immediately — no JS paint needed for colors.
 */
function applyThemeAttribute(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}

interface ThemeState {
  mode: ThemeMode;
  /** Exposed as PaletteMode for MUI; non-dark themes fall back to 'light'. */
  paletteMode: PaletteMode;
}

function toPaletteMode(mode: ThemeMode): PaletteMode {
  return mode === 'dark' ? 'dark' : 'light';
}

const initialMode = loadMode();
applyThemeAttribute(initialMode);  // Apply before first render — no flash

const themeSlice = createSlice({
  name: 'theme',
  initialState: (): ThemeState => ({
    mode: initialMode,
    paletteMode: toPaletteMode(initialMode),
  }),
  reducers: {
    toggleTheme(state) {
      const currentIdx = THEME_MODES.indexOf(state.mode);
      const nextMode = THEME_MODES[(currentIdx + 1) % THEME_MODES.length] ?? 'dark';
      state.mode = nextMode;
      state.paletteMode = toPaletteMode(nextMode);
      applyThemeAttribute(nextMode);
      try {
        localStorage.setItem(STORAGE_KEY, nextMode);
      } catch {
        // ignore
      }
    },

    setTheme(state, action: { payload: ThemeMode }) {
      const mode = action.payload;
      state.mode = mode;
      state.paletteMode = toPaletteMode(mode);
      applyThemeAttribute(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // ignore
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
