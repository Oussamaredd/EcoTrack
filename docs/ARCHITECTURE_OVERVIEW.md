# ADR-0001: Four-Layer Architecture Contract

- Status: Accepted
- Date: 2026-02-10
- Scope: `app`, `api`, `database`, `infrastructure`

## Context

The repository already follows a four-layer layout. Ownership and dependency direction must stay explicit to prevent cross-layer coupling and env-source drift.

## Decision

### Layer ownership

- `app`: frontend UI only (routing, views, client-side state, API calls).
- `api`: NestJS domain modules under `api/src/modules/<domain>` (for example `auth`, `users`, `reports`, `collections`, `routes`, `iot`) plus shared controllers/use-cases/repositories per module.
- `database`: Drizzle schema, database client factory, migrations, seed lifecycle.
- `infrastructure`: Docker/Terraform/ops scripts for runtime orchestration.

### Dependency direction

- `app` must not import runtime code from `api`, `database`, or `infrastructure`.
- `api` may depend on `database`.
- `database` must never depend on `api`.
- `infrastructure` runs migration/seed commands without API bootstrap.

### Runtime behavior rules

- `app` runtime must not render TanStack Query Devtools UI in any environment.
- `app` runtime must not render manual in-app debug/testing panels.
- Browser-facing app runtimes may proxy `/api` and `/health` at the frontend edge, but `app` source remains responsible only for UI and client-side API consumption.
- Controllers in `api` must not execute Drizzle queries directly.
- Data access path: `controller -> service -> repository -> database`.
- `database` is the source of truth for schema, migration, and seed commands.
- Consumers of `ecotrack-database` must import only from the package root entrypoint (`database/index.ts`).
- Domain controllers/services in `api` must not import `drizzle-orm` or `ecotrack-database` directly.
- The current `api` runtime remains a modular monolith backed by one shared database.
- Shared-database rule: each `api` module owns its repository writes and table access, even when the PostgreSQL instance is shared.
- Cross-module coordination in `api` must use narrow application contracts (service ports/facades), not another module's repositories or direct table writes.
- Shared database usage does not relax module ownership: table sharing is allowed only through the owning module's service contract.

### Environment ownership rules

- Host/native runtime source: root `.env` plus `app/.env.local` (`VITE_*` only).
- Docker runtime source: `infrastructure/environments/.env.docker`.
- Deployed runtime source: secret-manager injection; committed files are templates only.
- Canonical keys:
  - `DATABASE_URL`
  - `API_PORT`
  - `API_BASE_URL`
  - `VITE_API_BASE_URL`
- Canonical database name in templates: `ticketdb`.

## Enforcement

- Lint blocks forbidden cross-layer imports.
- CI/CD gates run architecture lint, migration checks, build/test, and env validation.
- Frontend env policy checks fail on non-`VITE_*` keys in frontend env files.

## Consequences

- Layer ownership is explicit and testable.
- Env-source ambiguity is removed across host, docker, and deploy workflows.
- Regression risk shifts from runtime surprises to CI failures.
