# EcoTrack Platform

Four-layer monorepo:

- `app`: React frontend (Vite)
- `api`: NestJS backend
- `database`: Drizzle schema/migrations/seeders
- `infrastructure`: Docker Compose and ops scripts

## Repository Layout

```text
EcoTrack/
|-- app/
|-- api/
|-- database/
|-- infrastructure/
|-- docs/
`-- .github/workflows/
```

## Canonical Env Model

- Host/native dev:
  - Private source: `/.env`
  - Frontend public source: `app/.env.local` (`VITE_*` only)
- Docker dev:
  - Source: `infrastructure/environments/.env.docker`
- Deployed dev/staging/prod:
  - Runtime source: secret-manager injection
  - Committed templates only:
    - `infrastructure/environments/.env.development.example`
    - `infrastructure/environments/.env.staging.example`
    - `infrastructure/environments/.env.production.example`

Precedence: process env > canonical workflow env file > `.example` templates.

## Quick Start (Host/Native)

```bash
npm install
cp .env.example .env
cp app/.env.example app/.env.local
npm run dev
```

`npm run dev` now blocks frontend startup until `http://localhost:3001/api/health/ready` returns `200`, so schema drift and failed migrations stop the host-dev flow before Vite starts.

Optional service-scoped templates:

```bash
cp api/.env.example api/.env
```

Default local endpoints:

- Frontend: `http://localhost:5173`
- Frontend edge API: `http://localhost:5173/api`
- Frontend edge health: `http://localhost:5173/health`
- Frontend edge readiness: `http://localhost:5173/api/health/ready`
- API (direct): `http://localhost:3001/api`
- API liveness: `http://localhost:3001/health`
- API readiness: `http://localhost:3001/api/health/ready`
- API diagnostics: `http://localhost:3001/api/health/database`

The browser should use the frontend origin for `/api` and `/health`, while `http://localhost:3001` stays available for direct API checks. If frontend `/api/*` requests fail, verify the API process directly with:

```bash
curl -f http://localhost:3001/health
curl -f http://localhost:3001/api/health/ready
```

If the readiness check fails, `npm run dev` will stop before launching the frontend dev server. Read the API startup error in the terminal output, then rerun `npm run dev` after the database or API issue is fixed.

## Auth Routes (Host/Docker)

- Login: `http://localhost:5173/login`
- Signup: `http://localhost:5173/signup`
- Forgot password: `http://localhost:5173/forgot-password`
- Reset password: `http://localhost:5173/reset-password`

Local auth contract:

- `POST /api/login` returns `{ code, accessToken, user }` for local sign-in; `code` remains available for callback compatibility
- `POST /api/signup` returns `{ accessToken, user }`
- frontend uses the direct local sign-in session when `accessToken` is present, and can still exchange login `code` via `POST /api/auth/exchange`
- frontend stores `accessToken` in `localStorage`
- protected API requests use `Authorization: Bearer <token>`
- frontend clears stale local bearer state when protected API requests return `401`
- reset endpoints are only `POST /api/forgot-password` and `POST /api/reset-password`
- in production, forgot-password returns `204` with no token/url payload

## OAuth Callback Setup

- Host dev callback URI: `http://localhost:5173/api/auth/google/callback`
- Docker dev callback URI: `http://localhost:3000/api/auth/google/callback`
- Set `API_BASE_URL` and `GOOGLE_CALLBACK_URL` to the same public edge origin in active runtime env files.
- In Google Cloud Console, **Authorized redirect URI** must exactly match runtime callback URI:
  - same scheme (`http/https`)
  - same host
  - same port
  - same path (`/api/auth/google/callback`)

## Quick Start (Docker Core)

```bash
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
npm run infra:up
```

Equivalent compose command:

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up --build -d
```

Default Docker browser entrypoints:

- Frontend: `http://localhost:3000`
- Frontend edge API: `http://localhost:3000/api`
- Frontend edge health: `http://localhost:3000/health`
- Frontend edge readiness: `http://localhost:3000/api/health/ready`
- API (direct): `http://localhost:3001/api`

## Env Key Canonicalization

Canonical keys:

- `DATABASE_URL`
- `API_PORT`
- `API_BASE_URL`
- `VITE_API_BASE_URL`

Deprecated aliases (temporary compatibility only):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `PORT` -> `API_PORT`
- `DB_*` -> `DATABASE_URL`

Database name policy: committed connection-string templates target `ticketdb`.

## Root Commands

- `npm run dev` - host/native app + api dev workflow
- `npm run dev:doctor` - fast host diagnostics (env keys, db reachability/migrations, health endpoints)
- `npm run build` - build database, app, api
- `npm run test` - app + api tests
- `npm run test:e2e` - key citizen/agent/manager journey tests
- `npm run test:coverage` - coverage-gated validation for app + api
- `npm run typecheck` - app + api + database type checks
- `npm run lint` - lint + architecture boundaries
- `npm run validate-specs` - enforce CDC traceability matrix and executable spec contracts
- `npm run db:migrate` - run Drizzle migrations
- `npm run db:seed` - run seeders
- `npm run infra:up` / `npm run infra:down` / `npm run infra:health` - Docker lifecycle wrappers

`npm run infra:health` is a strict gate: it exits non-zero when Docker is unreachable or any core service health check fails.

## Architecture Contract

See `docs/ARCHITECTURE_OVERVIEW.md`.

## Documentation Map

See `docs/README.md` for organized documentation by domain (setup, env, operations, API, and runbooks).

## CI/CD

`CI.yml` and `CD.yml` enforce architecture, migration, build/test, and env validation gates.
