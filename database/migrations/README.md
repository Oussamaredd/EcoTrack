Drizzle migration source of truth

- Canonical migration chain is tracked in `database/migrations/meta/_journal.json`.
- Use `npm run db:generate --workspace=ecotrack-database` to create new migrations.
- Apply migrations with `npm run db:migrate --workspace=ecotrack-database`.
- When `DATABASE_URL` targets Neon, migrations and seed execution must use the direct connection string. Pooled Neon hosts include `-pooler` in the hostname and are rejected by the workspace guard script.
- Legacy/manual SQL files have been removed to avoid migration drift; only numbered Drizzle migrations in this directory should be applied.
