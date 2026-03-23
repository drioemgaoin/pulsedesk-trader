# syntax=docker/dockerfile:1
#
# Multi-stage Dockerfile — builds all five MFE apps and serves them via NGINX.
#
# Build stages (Docker BuildKit runs independent stages in parallel):
#   deps          — workspace dependency install (shared across all build stages)
#   build-shell   — apps/trader-ui   (shell host)
#   build-trading — apps/trading-mfe (remote)
#   build-portfolio — apps/portfolio-mfe (remote)
#   build-orders  — apps/orders-mfe (remote)
#   build-sim     — apps/simulator-mfe (remote)
#   server        — nginx:alpine with all five dist outputs
#
# Build args (passed from docker-compose.yml; defaults match the Docker Compose NGINX setup):
#   VITE_API_BASE_URL         — REST API base URL the browser uses
#   VITE_STREAM_URL           — WebSocket URL for market data stream
#   VITE_TRADING_REMOTE_URL   — base URL for trading-mfe remoteEntry.js
#   VITE_PORTFOLIO_REMOTE_URL — base URL for portfolio-mfe remoteEntry.js
#   VITE_ORDERS_REMOTE_URL    — base URL for orders-mfe remoteEntry.js
#   VITE_SIMULATOR_REMOTE_URL — base URL for simulator-mfe remoteEntry.js
#   VITE_GRAFANA_URL          — Grafana base URL shown in simulator observability links
#   VITE_RATE_LIMIT_PER_MIN   — gateway rate limit used by simulator warning guard

# ── Base: pnpm + Node 20 ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Deps: install all workspace dependencies once ────────────────────────────
FROM base AS deps
WORKDIR /workspace

# Copy manifests only — layer cache invalidated only when deps change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json          ./packages/contracts/package.json
COPY packages/ui/package.json                 ./packages/ui/package.json
COPY apps/trader-ui/package.json              ./apps/trader-ui/package.json
COPY apps/trading-mfe/package.json            ./apps/trading-mfe/package.json
COPY apps/portfolio-mfe/package.json          ./apps/portfolio-mfe/package.json
COPY apps/orders-mfe/package.json             ./apps/orders-mfe/package.json
COPY apps/simulator-mfe/package.json          ./apps/simulator-mfe/package.json
# Service manifests — required for workspace dependency graph resolution
COPY services/api-gateway/package.json        ./services/api-gateway/package.json
COPY services/market-data-service/package.json ./services/market-data-service/package.json
COPY services/order-service/package.json      ./services/order-service/package.json
COPY services/risk-service/package.json       ./services/risk-service/package.json
COPY services/execution-service/package.json  ./services/execution-service/package.json
COPY services/portfolio-service/package.json  ./services/portfolio-service/package.json
COPY services/notification-service/package.json ./services/notification-service/package.json

RUN pnpm install --frozen-lockfile

# Copy full source after deps are cached
COPY packages/contracts/ ./packages/contracts/
COPY packages/ui/        ./packages/ui/
COPY apps/trader-ui/     ./apps/trader-ui/
COPY apps/trading-mfe/   ./apps/trading-mfe/
COPY apps/portfolio-mfe/ ./apps/portfolio-mfe/
COPY apps/orders-mfe/    ./apps/orders-mfe/
COPY apps/simulator-mfe/ ./apps/simulator-mfe/

# Build contracts package first (required by all apps)
RUN pnpm --filter @pulsedesk/contracts build

# ── Build args — Vite bakes these into the bundles at build time ─────────────
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_STREAM_URL=ws://localhost:3016/stream
ARG VITE_TRADING_REMOTE_URL=http://localhost:5173/trading
ARG VITE_PORTFOLIO_REMOTE_URL=http://localhost:5173/portfolio
ARG VITE_ORDERS_REMOTE_URL=http://localhost:5173/orders
ARG VITE_SIMULATOR_REMOTE_URL=http://localhost:5173/simulator
ARG VITE_GRAFANA_URL=http://localhost:3001
ARG VITE_RATE_LIMIT_PER_MIN=100

# ── Shell build ───────────────────────────────────────────────────────────────
FROM deps AS build-shell
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STREAM_URL=$VITE_STREAM_URL
ENV VITE_TRADING_REMOTE_URL=$VITE_TRADING_REMOTE_URL
ENV VITE_PORTFOLIO_REMOTE_URL=$VITE_PORTFOLIO_REMOTE_URL
ENV VITE_ORDERS_REMOTE_URL=$VITE_ORDERS_REMOTE_URL
ENV VITE_SIMULATOR_REMOTE_URL=$VITE_SIMULATOR_REMOTE_URL
WORKDIR /workspace/apps/trader-ui
RUN pnpm build

# ── Trading MFE build ─────────────────────────────────────────────────────────
FROM deps AS build-trading
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STREAM_URL=$VITE_STREAM_URL
WORKDIR /workspace/apps/trading-mfe
RUN pnpm build

# ── Portfolio MFE build ───────────────────────────────────────────────────────
FROM deps AS build-portfolio
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
WORKDIR /workspace/apps/portfolio-mfe
RUN pnpm build

# ── Orders MFE build ──────────────────────────────────────────────────────────
FROM deps AS build-orders
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
WORKDIR /workspace/apps/orders-mfe
RUN pnpm build

# ── Simulator MFE build ───────────────────────────────────────────────────────
FROM deps AS build-sim
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GRAFANA_URL=$VITE_GRAFANA_URL
ENV VITE_RATE_LIMIT_PER_MIN=$VITE_RATE_LIMIT_PER_MIN
WORKDIR /workspace/apps/simulator-mfe
RUN pnpm build

# ── NGINX server — assembles all five dist outputs ────────────────────────────
FROM nginx:1.27-alpine AS server

# Remove default NGINX config; replace with MFE config
RUN rm /etc/nginx/conf.d/default.conf
COPY infrastructure/nginx/mfe.conf /etc/nginx/conf.d/default.conf

# Copy each app's dist into the sub-path NGINX expects (see mfe.conf)
COPY --from=build-shell     /workspace/apps/trader-ui/dist    /usr/share/nginx/html/shell
COPY --from=build-trading   /workspace/apps/trading-mfe/dist  /usr/share/nginx/html/trading
COPY --from=build-portfolio /workspace/apps/portfolio-mfe/dist /usr/share/nginx/html/portfolio
COPY --from=build-orders    /workspace/apps/orders-mfe/dist   /usr/share/nginx/html/orders
COPY --from=build-sim       /workspace/apps/simulator-mfe/dist /usr/share/nginx/html/simulator

EXPOSE 80

# Graceful shutdown: NGINX handles SIGTERM natively — active connections drain
# within worker_shutdown_timeout (default 10s) before worker exits.
STOPSIGNAL SIGTERM

CMD ["nginx", "-g", "daemon off;"]
