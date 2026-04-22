Managed Postgres baselines

- `managed-postgres-current.sql` is the repo-generated current-schema baseline for blank provider-managed Postgres targets such as Supabase projects that already reserve the `auth` schema.
- Regenerate it with `npm run db:baseline:managed --workspace=ecotrack-database`.
- The generated baseline includes repo-owned manual SQL supplements for structures that `drizzle-kit export` does not emit, including the partitioned `iot.measurements` layout, its `iot.measurements_default` partition, and the provider-owned `auth.users` foreign key from `identity.users.auth_user_id`.
- Apply it only to blank managed targets before importing app-owned data.
- Do not apply it on an existing repo-managed database that already tracks the numbered Drizzle migration chain.
