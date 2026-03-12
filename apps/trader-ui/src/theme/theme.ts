import { createTheme } from '@mui/material/styles';

// Extend MUI palette to include custom tokens defined in DDR-M9-T2-brand-identity.md
declare module '@mui/material/styles' {
  interface Palette {
    trading: {
      uptick: string;
      downtick: string;
      pending: string;
      neutral: string;
    };
  }
  interface PaletteOptions {
    trading?: {
      uptick?: string;
      downtick?: string;
      pending?: string;
      neutral?: string;
    };
  }
  interface TypeBackground {
    elevated: string;
  }
}

declare module '@mui/material/styles/createPalette' {
  interface TypeBackground {
    elevated: string;
  }
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0a0a',
      paper: '#111111',
      // @ts-expect-error — extended via module augmentation above
      elevated: '#1a1a1a',
    },
    divider: '#2a2a2a',
    primary: {
      main: '#00bcd4',
      dark: '#0097a7',
      light: '#4dd0e1',
    },
    text: {
      primary: '#f0f0f0',
      secondary: '#888888',
      disabled: '#444444',
    },
    trading: {
      uptick: '#26a69a',
      downtick: '#ef5350',
      pending: '#ffa726',
      neutral: '#666666',
    },
    error: { main: '#ef5350' },
    warning: { main: '#ffa726' },
    success: { main: '#26a69a' },
    info: { main: '#42a5f5' },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    fontSize: 13,
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500, fontSize: 13 },
    body1: { fontSize: 13 },
    body2: { fontSize: 12 },
    caption: { fontSize: 11 },
  },
  spacing: 4, // base unit 4px; theme.spacing(1) = 4px
  shape: {
    borderRadius: 4,
  },
  components: {
    // Dense tables everywhere
    MuiTable: {
      defaultProps: { size: 'small' },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: '#2a2a2a',
          padding: '6px 8px',
        },
        head: {
          color: '#888888',
          fontWeight: 500,
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    // Dense form controls everywhere
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: 13 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: '#2a2a2a' },
      },
    },
    // AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#111111',
          borderBottom: '1px solid #2a2a2a',
          boxShadow: 'none',
        },
      },
    },
    // Tabs
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: 13,
          fontWeight: 500,
          minHeight: 48,
          textTransform: 'none',
          color: '#888888',
          '&.Mui-selected': {
            color: '#f0f0f0',
            fontWeight: 600,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#00bcd4', height: 2 },
      },
    },
    // Cards/Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111111',
          border: '1px solid #2a2a2a',
        },
      },
    },
    // Chips
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { fontSize: 11, fontWeight: 500 },
      },
    },
    // Buttons
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: '#111111', border: '1px solid #2a2a2a' },
      },
    },
    // Tooltip
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', fontSize: 11 },
      },
    },
    // Skeleton loading
    MuiSkeleton: {
      defaultProps: { animation: 'pulse' },
      styleOverrides: {
        root: { backgroundColor: '#1a1a1a' },
      },
    },
    // List items (dense)
    MuiListItem: {
      defaultProps: { dense: true },
    },
  },
});
