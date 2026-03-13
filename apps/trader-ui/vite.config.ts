import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
/// <reference types="vitest" />

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Watches each remote's remoteEntry.js and sends a full-reload to the browser
// when a rebuild completes, giving live-update behaviour during `dev:frontend`.
function remoteHmrPlugin() {
  return {
    name: 'remote-hmr-watcher',
    apply: 'serve' as const,
    configureServer(server: import('vite').ViteDevServer) {
      const remoteEntries = [
        path.resolve(__dirname, '../trading-mfe/dist/assets/remoteEntry.js'),
        path.resolve(__dirname, '../portfolio-mfe/dist/assets/remoteEntry.js'),
        path.resolve(__dirname, '../orders-mfe/dist/assets/remoteEntry.js'),
        path.resolve(__dirname, '../simulator-mfe/dist/assets/remoteEntry.js'),
      ];
      remoteEntries.forEach((p) => server.watcher.add(p));
      server.watcher.on('change', (changedPath) => {
        if (changedPath.includes('remoteEntry.js')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const tradingUrl = env['VITE_TRADING_REMOTE_URL'] ?? 'http://localhost:5174';
  const portfolioUrl = env['VITE_PORTFOLIO_REMOTE_URL'] ?? 'http://localhost:5175';
  const ordersUrl = env['VITE_ORDERS_REMOTE_URL'] ?? 'http://localhost:5176';
  const simulatorUrl = env['VITE_SIMULATOR_REMOTE_URL'] ?? 'http://localhost:5177';

  // vite-plugin-federation only generates remoteEntry.js during `vite build`.
  // Remotes are built with --watch and served via `vite preview`.
  const remoteEntry = '/assets/remoteEntry.js';

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
      remoteHmrPlugin(),
      federation({
        name: 'shell',
        remotes: {
          tradingMfe: `${tradingUrl}${remoteEntry}`,
          portfolioMfe: `${portfolioUrl}${remoteEntry}`,
          ordersMfe: `${ordersUrl}${remoteEntry}`,
          simulatorMfe: `${simulatorUrl}${remoteEntry}`,
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
      target: 'esnext',
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
