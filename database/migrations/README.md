Drizzle migration source of truth

- Canonical migration chain is tracked in `database/migrations/meta/_journal.json`.
- Use `npm run db:generate --workspace=ecotrack-database` to create new migrations.
- Apply migrations with `npm run db:migrate --workspace=ecotrack-database`.
- Generate the current-schema managed baseline SQL with `npm run db:baseline:managed --workspace=ecotrack-database`.
- Export app-owned data with `npm run db:export:data --workspace=ecotrack-database -- <path-to-dump.sql>`.
- Import app-owned data with `npm run db:import:data --workspace=ecotrack-database -- <path-to-dump.sql>`.
- On WSL, the migration/seed guard rewrites `DATABASE_URL` from loopback hosts to the Windows-host gateway when `localhost` is unreachable, so native WSL database commands can still reach a Windows-hosted Postgres instance.
- Migration and seed execution must use a direct Postgres connection string. Pooled/provider proxy hosts that contain `-pooler.` or `.pooler.` in the hostname are rejected by the workspace guard script.
- The direct-connection guard now runs the child database command with the rewritten `DATABASE_URL`, so the WSL host-gateway fallback applies to the actual Drizzle or Postgres client process instead of only the preflight check.
- Migration `0026_identity_schema_for_supabase.sql` renames the app-owned identity tables from `auth` to `identity` so provider-managed auth schemas, including Supabase Auth, can remain reserved for the provider.
- The managed baseline generator appends repo-owned manual SQL supplements for historical structures that are not emitted by `drizzle-kit export`, such as `iot.measurements_default`.
- Blank Supabase projects should not replay the historical pre-`0026` chain directly against the provider-managed `auth` schema. Use `database/migrations/baselines/managed-postgres-current.sql` for blank managed targets, then import data-only app schemas after the source database has applied `0026`.
- Legacy/manual SQL files have been removed to avoid migration drift; only numbered Drizzle migrations in this directory should be applied.
