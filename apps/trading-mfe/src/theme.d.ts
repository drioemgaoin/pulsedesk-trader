import '@mui/material/styles';

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
}
