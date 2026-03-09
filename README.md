# PulseDesk Trading Platform

Monorepo workspace for the PulseDesk microservices platform and trader workstation.

## Structure

- `apps/trader-ui` - React SPA workstation
- `services/*` - backend microservices (to be scaffolded in M1)
- `packages/*` - shared contracts and common libraries
- `infrastructure/` - Docker Compose and deployment assets

## Workspace commands

- `pnpm dev` - run trader UI
- `pnpm lint` - lint app workspaces
- `pnpm test` - run tests in app workspaces
- `pnpm build` - build app workspaces

## Local platform goal

The repository is configured for local development via Docker Compose and is planned to scale to multi-server deployment profiles as defined in `.claude/agile/PROJECT.md`.
