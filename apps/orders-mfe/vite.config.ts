/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

const shared = {
  '@pulsedesk/ui': { singleton: true, requiredVersion: '^0.1.0' },
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
      name: 'ordersMfe',
      filename: 'remoteEntry.js',
      exposes: {
        './OrdersPage': './src/OrdersPage.tsx',
      },
      shared,
    }),
  ],
  server: {
    port: 5176,
    strictPort: true,
  },
  preview: {
    port: 5176,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    emptyOutDir: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
