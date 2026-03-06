# Environment Setup Guide

This guide uses the canonical env architecture and strict frontend/backend separation.
For the current runtime port and origin contract, use `docs/ENV.md` as the active source of truth.

## Workflow Mapping

| Workflow | Canonical source | Notes |
| --- | --- | --- |
| local-dev | `/.env` + `app/.env.local` | `app/.env.local` must contain only `VITE_*` keys |
| docker-dev | `infrastructure/environments/.env.docker` | Used by compose core profile with `--env-file` |
| deploy-dev | secret-manager injection | Use committed template `.env.development.example` |
| deploy-staging | secret-manager injection | Use committed template `.env.staging.example` |
| deploy-prod | secret-manager injection | Use committed template `.env.production.example` |

## Precedence Rules

1. Explicit process env
2. Canonical workflow env file
3. `.example` templates (never runtime inputs)

## Local/Native Setup

```bash
cp .env.example .env
cp app/.env.example app/.env.local
```

Optional service-scoped template (reference only; root `/.env` remains the local runtime source):

```bash
cp api/.env.example api/.env
```

Managed Neon local-testing note:

- When you intentionally want local native `api`/`database` commands to target the managed Neon baseline, update root `/.env` `DATABASE_URL` to the direct Neon connection string.
- Keep `app/.env.local` frontend-only (`VITE_*` keys only).
- Keep `infrastructure/environments/.env.docker` pointed at the local Docker Postgres sandbox unless you are deliberately changing the Docker workflow.

## Docker Setup

```bash
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
npm run infra:up
npm run smoke-test
```

## Port Contract

- Local/native dev browser traffic enters through `http://localhost:5173`; the API process listens on `http://localhost:3001` for local-native diagnostics only.
- Docker dev browser traffic enters through `http://localhost:3000`; the backend still listens on `API_PORT=3001`, but that port stays internal-only on the Docker network.
- `API_PORT` is the backend listen port, while `API_BASE_URL` and `VITE_API_BASE_URL` must resolve to the public frontend edge origin.

## Deployed Environments

Do not commit runtime secrets. Inject values at runtime from secret manager.

Templates to keep in source control:

- `infrastructure/environments/.env.development.example`
- `infrastructure/environments/.env.staging.example`
- `infrastructure/environments/.env.production.example`

## GitHub Pages Status

- GitHub Pages is retired as the EcoTrack app host.
- `.github/workflows/CD.yml` no longer publishes the frontend to GitHub Pages.
- Any future GitHub Pages publishing is reserved for docs-only follow-up work.
- Do not point app deploy env values, OAuth settings, or frontend links at a `github.io` URL.

## Canonical Keys

- `DATABASE_URL`
- `API_PORT`
- `API_BASE_URL`
- `VITE_API_BASE_URL`

## OAuth Callback Requirements

- Canonical callback URI for local dev:
  - `http://localhost:5173/api/auth/google/callback`
- Canonical callback URI for Docker dev:
  - `http://localhost:3000/api/auth/google/callback`
- `GOOGLE_CLIENT_ID` must be a Google OAuth Web client ID in this format:
  - `<numeric-project-id>-<client>.apps.googleusercontent.com`
- Set `API_BASE_URL` and `GOOGLE_CALLBACK_URL` to the same public edge origin in runtime env files.
- Google Cloud Console Authorized redirect URI must match exactly:
  - scheme + host + port + path
  - expected path: `/api/auth/google/callback`

Deprecated aliases:

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `PORT` -> `API_PORT`
- `DB_*` -> `DATABASE_URL`

## Validation Commands

```bash
npm run validate-env:all
npm run dev:doctor
npm run infra:health
npm run smoke-test
npm run db:migrate --workspace=ecotrack-database
npm run build
npm run test
```


