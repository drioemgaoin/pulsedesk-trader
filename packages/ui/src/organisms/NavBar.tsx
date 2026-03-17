import React from 'react';
import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '../atoms';
import { DarkModeIcon, LightModeIcon, LogoutIcon } from '../icons';
import { BrandWordmark } from '../molecules';

export interface NavBarLink {
  /** Route label shown in the nav */
  label: string;
  /** MUI SvgIcon component */
  icon: React.ComponentType<{ sx?: Record<string, unknown> }>;
  /** Whether this link is the currently active route */
  isActive: boolean;
  /** Called when the user clicks the link */
  onClick: () => void;
}

export interface NavBarProps {
  /** Navigation links rendered in the center of the bar */
  navLinks: NavBarLink[];
  /** Authenticated username — hidden when not provided */
  username?: string;
  /** Current colour-scheme mode */
  themeMode: 'light' | 'dark';
  /** Called when the user clicks the theme toggle */
  onToggleTheme: () => void;
  /** Called when the user clicks the logout button */
  onLogout: () => void;
}

/**
 * AppShell navigation bar.
 *
 * Router-agnostic: receives `isActive` + `onClick` per link so it can be
 * used with any router (or without one, e.g. in Storybook).
 */
export function NavBar({ navLinks, username, themeMode, onToggleTheme, onLogout }: NavBarProps) {
  if (!navLinks) return null;
  return (
    <AppBar position="static" component="header">
      <Toolbar variant="dense" sx={{ gap: 0, minHeight: 48 }}>
        {/* ── Wordmark ── */}
        <Box sx={{ mr: 3, flexShrink: 0 }}>
          <BrandWordmark size="sm" />
        </Box>

        {/* ── Nav links ── */}
        <Box component="nav" aria-label="Main navigation" sx={{ display: 'flex', flex: 1 }}>
          {navLinks.map(({ label, icon: Icon, isActive, onClick }) => (
            <Box
              key={label}
              component="button"
              onClick={onClick}
              aria-current={isActive ? 'page' : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                height: 48,
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'primary.main' : 'text.primary',
                background: 'none',
                border: 'none',
                borderBottom: '2px solid',
                borderBottomColor: isActive ? 'primary.main' : 'transparent',
                cursor: 'pointer',
                transition: 'color 120ms, border-color 120ms, opacity 120ms',
                opacity: isActive ? 1 : 0.72,
                '&:hover': !isActive
                  ? { color: 'primary.light', opacity: 1 }
                  : {},
                '&:active': { opacity: 0.72 },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '-2px',
                  borderRadius: 1,
                },
              }}
            >
              <Icon sx={{ fontSize: 15, opacity: 0.85 }} />
              {label}
            </Box>
          ))}
        </Box>

        {/* ── Right controls ── */}
        {username && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mr: 1, fontWeight: 500 }}
          >
            {username}
          </Typography>
        )}

        <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
          <IconButton
            aria-label={
              themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            size="small"
            onClick={onToggleTheme}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            {themeMode === 'dark' ? (
              <LightModeIcon sx={{ fontSize: 17 }} />
            ) : (
              <DarkModeIcon sx={{ fontSize: 17 }} />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Sign out">
          <IconButton
            aria-label="Log out"
            size="small"
            onClick={onLogout}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <LogoutIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
