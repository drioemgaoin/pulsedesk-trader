import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
/// <reference types="vitest" />

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const tradingUrl = env['VITE_TRADING_REMOTE_URL'] ?? 'http://localhost:5174';
  const portfolioUrl = env['VITE_PORTFOLIO_REMOTE_URL'] ?? 'http://localhost:5175';
  const ordersUrl = env['VITE_ORDERS_REMOTE_URL'] ?? 'http://localhost:5176';
  const simulatorUrl = env['VITE_SIMULATOR_REMOTE_URL'] ?? 'http://localhost:5177';

  // Shared singleton packages — every remote must declare the same list.
  // Version mismatch = two React instances = Hooks invariant violation.
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

  return {
    plugins: [
      react(),
      federation({
        name: 'shell',
        remotes: {
          tradingMfe: `${tradingUrl}/assets/remoteEntry.js`,
          portfolioMfe: `${portfolioUrl}/assets/remoteEntry.js`,
          ordersMfe: `${ordersUrl}/assets/remoteEntry.js`,
          simulatorMfe: `${simulatorUrl}/assets/remoteEntry.js`,
        },
        shared,
      }),
    ],
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      // Required by vite-plugin-federation for ES module federation
      target: 'es2020',
      minify: false,
      cssCodeSplit: false,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      globals: true,
    },
  };
});
