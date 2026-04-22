# Neon Managed Postgres Baseline

Last updated: 2026-04-22

## Baseline contract

- Managed deployment database baseline: Neon Postgres.
- Local Docker Postgres remains a local development sandbox only.
- Repository source of truth remains `database/schema/index.ts`, `database/migrations/**`, and `database/seeds/**`.
- Neon MCP is used only for bootstrap, provisioning, inspection, and safe validation tasks.
- Initial managed layout stays minimal: one Neon project, one baseline branch, one canonical target database name: `ecotrack`.
- Neon connection strings and secrets must never be committed.

## Provisioned resources

- Project: `ecotrack` (`late-feather-53975393`)
- Region: `aws-eu-central-1` (AWS Europe Central 1 / Frankfurt)
- Baseline branch: `main` (`br-steep-lab-agvsxfde`)
- Branch databases: `postgres`, `ticketdb`
- Historical validated application database: `ticketdb`
- Historical baseline role used for connection validation: `ticketdb_owner`
- Canonical target database name for the Supabase migration path: `ecotrack`
- Wrong-region cleanup completed:
  - deleted `still-sky-85890306` (`ecotrack`, `aws-us-west-2`)
  - deleted `frosty-salad-58112443` (`ecotrack-frankfurt`, `aws-us-east-2`)

## Repo state

- `DATABASE_URL` is already the canonical database env key for the database package and API runtime.
- `npm run db:migrate --workspace=ecotrack-database` applies the tracked Drizzle migration chain.
- `npm run db:seed --workspace=ecotrack-database` runs the existing seed strategy in `database/seeds/index.ts`.
- `npm run db:baseline:managed --workspace=ecotrack-database` generates `database/migrations/baselines/managed-postgres-current.sql` for blank provider-managed Postgres targets.
- `npm run db:export:data --workspace=ecotrack-database -- <dump.sql>` exports data-only app schemas from the current direct `DATABASE_URL`.
- `npm run db:import:data --workspace=ecotrack-database -- <dump.sql>` restores a data-only dump into the current direct `DATABASE_URL`.
- Migration and seed commands now reject pooled/provider proxy hosts that contain `-pooler.` or `.pooler.` in the hostname.
- The direct-connection guard now launches Drizzle and Postgres client commands with the rewritten WSL gateway URL when localhost is unreachable, so the fallback applies to the actual child process.
- The Frankfurt baseline was migrated and seeded from the repo using the direct Neon URL only.
- Migration `0026_identity_schema_for_supabase.sql` now reserves provider-managed `auth` schemas by renaming the app-owned auth tables to `identity`.
- Supabase hosted target URLs may still point at database `postgres`; that provider-managed physical name is allowed even though self-managed repo templates still use `ecotrack`.

## Codex MCP setup

- Project-scoped Codex MCP config lives at `.codex/config.toml`.
- The configured Neon MCP endpoint is `https://mcp.neon.tech/mcp`.
- OAuth credentials are not stored in the repository. Authenticate from this repo root with:

```bash
codex mcp login neon -c 'mcp_servers.neon.url="https://mcp.neon.tech/mcp"'
```

- Browser approval remains a manual prerequisite whenever the MCP session needs to be re-authenticated.
- Neon MCP was used for project inspection and read-only validation in this phase.
- Region-correct project creation required Neon CLI because the MCP `create_project` capability exposed in this session did not accept a region parameter.

## Bootstrap sequence

1. Authenticate Codex to Neon MCP.
2. Create a single Neon project in `aws-eu-central-1`.
3. Keep exactly one baseline branch.
4. Create or confirm the target database name `ecotrack`.
5. In Neon Connect details, disable connection pooling and copy the direct connection string for the chosen branch, database, and role.
6. Store that direct URL only in:
   - root `.env` for local, untracked developer testing
   - deployment/provider secret managers for hosted environments

## Managed connection rules

- Direct connection required for repo migrations and seed execution.
- Pooled/provider proxy URLs include `-pooler.` or `.pooler.` in the hostname and must not be used for `db:migrate` or `db:seed`.
- Keeping a single direct `DATABASE_URL` is the minimal baseline for this phase; introducing a second runtime URL is deferred until it is operationally necessary.

## Validation workflow

Database side:

- Confirm the selected Neon project contains the current validated database and that the target migration plan renames it to `ecotrack`.
- Inspect schemas and tables after migration; the latest repo migration chain expects `identity`, `core`, `iot`, `ops`, `incident`, `notify`, `game`, `audit`, `admin`, `export`, and `support`.
- For a blank Supabase project, apply `database/migrations/baselines/managed-postgres-current.sql` instead of replaying the full historical chain, then import the data-only dump produced from the renamed source database.
- Run only read-only validation queries against Neon after migration and any optional seed step.
- Current validated result:
  - schemas present before the `0026_identity_schema_for_supabase.sql` rename: `admin`, `audit`, `auth`, `core`, `drizzle`, `export`, `game`, `incident`, `iot`, `notify`, `ops`, `public`, `support`
  - representative row counts before the rename: `auth.users=7`, `support.tickets=3`, `core.zones=2`, `ops.tours=1`, `iot.sensor_devices=3`, `incident.alert_events=1`

Application side:

- Point root `.env` `DATABASE_URL` to the direct Neon URL.
- Start the API and verify `GET /api/health/ready` succeeds.
- The readiness check already exercises ticketing, planning, and telemetry table access from the API runtime.
- Current validated result: local API booted against the Frankfurt direct URL and `GET /api/health/ready` returned HTTP `200`.

## Remaining manual steps

- Put the direct Frankfurt `DATABASE_URL` into local untracked env files only when you intentionally want local runtime or tooling to target Neon.
- Add the same direct URL to deployment/provider secret stores for hosted environments and migration jobs.
- No Neon connection string or password was written to tracked files.

## Follow-up items

- Add deployment-secret values for the hosted API environment once the Neon project, branch, database, and role are finalized.
- Decide later whether hosted runtime should continue using the same direct `DATABASE_URL` or adopt a separate pooled runtime URL alongside a direct migration URL.
- Add CI/CD migration execution only after the managed secret path is finalized.
