Drizzle migration source of truth

- Canonical migration chain is tracked in `database/migrations/meta/_journal.json`.
- Use `npm run db:generate --workspace=ecotrack-database` to create new migrations.
- Apply migrations with `npm run db:migrate --workspace=ecotrack-database`.
- On WSL, the migration/seed guard rewrites `DATABASE_URL` from loopback hosts to the Windows-host gateway when `localhost` is unreachable, so native WSL database commands can still reach a Windows-hosted Postgres instance.
- When `DATABASE_URL` targets Neon, migrations and seed execution must use the direct connection string. Pooled Neon hosts include `-pooler` in the hostname and are rejected by the workspace guard script.
- Legacy/manual SQL files have been removed to avoid migration drift; only numbered Drizzle migrations in this directory should be applied.
