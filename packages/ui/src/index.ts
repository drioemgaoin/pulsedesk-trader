/**
 * @pulsedesk/ui — PulseDesk component library
 * ════════════════════════════════════════════════════════════════════════
 *
 * Atomic design structure:
 *   atoms/     — MUI component re-exports (the building blocks)
 *   molecules/ — PulseDesk-specific composed components
 *   organisms/ — Large page-level compositions (added as needed)
 *   icons/     — Icon re-exports
 *   tokens     — Design token constants (SIZES, status colors, sx helpers)
 *   theme      — MUI theme factory (createAppTheme, theme)
 *
 * Pages and MFEs import exclusively from '@pulsedesk/ui'.
 * Never import from '@mui/material' or '@mui/icons-material' directly.
 */

export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './icons';
export * from './tokens';
export * from './theme';
