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
COPY services/risk-service/package.json ./services/risk-service/package.json

# Stub manifests for remaining workspace members (required for pnpm workspace resolution)
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/trader-ui/package.json ./apps/trader-ui/package.json
COPY apps/orders-mfe/package.json ./apps/orders-mfe/package.json
COPY apps/portfolio-mfe/package.json ./apps/portfolio-mfe/package.json
COPY apps/simulator-mfe/package.json ./apps/simulator-mfe/package.json
COPY apps/trading-mfe/package.json ./apps/trading-mfe/package.json
COPY apps/storybook/package.json ./apps/storybook/package.json
COPY apps/e2e/package.json ./apps/e2e/package.json
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
COPY services/risk-service/ ./services/risk-service/
RUN pnpm --filter @pulsedesk/contracts build && \
    pnpm --filter @pulsedesk/risk-service build

# ── Production deploy (devDeps pruned, workspace deps resolved, no pnpm binary) ──
FROM build AS prod-deploy
RUN pnpm --filter @pulsedesk/risk-service deploy --prod --legacy /prod/risk-service

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Production-only node_modules from pnpm deploy (no pnpm, no build-time devDeps)
COPY --from=prod-deploy /prod/risk-service/node_modules ./node_modules
# Compiled output from build stage (pnpm deploy does not copy dist/)
COPY --from=build /workspace/services/risk-service/dist ./dist
EXPOSE 3013
CMD ["node", "--require", "./dist/instrumentation.js", "dist/main.js"]
