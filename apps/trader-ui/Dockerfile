# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/trader-ui/package.json ./apps/trader-ui/package.json
# Stub manifests for workspace resolution
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY services/api-gateway/package.json ./services/api-gateway/package.json
COPY services/market-data-service/package.json ./services/market-data-service/package.json
COPY services/order-service/package.json ./services/order-service/package.json
COPY services/risk-service/package.json ./services/risk-service/package.json
COPY services/execution-service/package.json ./services/execution-service/package.json
COPY services/portfolio-service/package.json ./services/portfolio-service/package.json
COPY services/notification-service/package.json ./services/notification-service/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS runner
COPY apps/trader-ui/ ./apps/trader-ui/
WORKDIR /workspace/apps/trader-ui
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
