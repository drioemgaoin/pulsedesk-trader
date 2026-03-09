# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Dependency install (cached until lockfile or any package.json changes) ──
FROM base AS deps
WORKDIR /workspace

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Package manifests for workspace members needed to build this service
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY services/order-service/package.json ./services/order-service/package.json

# Stub manifests for remaining workspace members (required for pnpm workspace resolution)
COPY apps/trader-ui/package.json ./apps/trader-ui/package.json
COPY services/market-data-service/package.json ./services/market-data-service/package.json
COPY services/order-service/package.json ./services/order-service/package.json
COPY services/risk-service/package.json ./services/risk-service/package.json
COPY services/execution-service/package.json ./services/execution-service/package.json
COPY services/portfolio-service/package.json ./services/portfolio-service/package.json
COPY services/notification-service/package.json ./services/notification-service/package.json

RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────────
FROM deps AS build
COPY packages/contracts/ ./packages/contracts/
COPY services/order-service/ ./services/order-service/
RUN pnpm --filter @pulsedesk/contracts build && \
    pnpm --filter @pulsedesk/order-service build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM build AS runner
WORKDIR /workspace/services/order-service
ENV NODE_ENV=production
EXPOSE 3012
CMD ["node", "dist/main.js"]
