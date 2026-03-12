import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

const shared = {
  react: { singleton: true, requiredVersion: '^19.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
  'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
  '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.0.0' },
  'react-redux': { singleton: true, requiredVersion: '^9.0.0' },
  '@tanstack/react-query': { singleton: true, requiredVersion: '^5.0.0' },
  '@mui/material': { singleton: true, requiredVersion: '^6.0.0' },
  '@emotion/react': { singleton: true, requiredVersion: '^11.0.0' },
  '@emotion/styled': { singleton: true, requiredVersion: '^11.0.0' },
};

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'tradingMfe',
      filename: 'remoteEntry.js',
      exposes: {
        './TradingTerminalPage': './src/TradingTerminalPage.tsx',
      },
      shared,
    }),
  ],
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    minify: false,
    cssCodeSplit: false,
  },
});
