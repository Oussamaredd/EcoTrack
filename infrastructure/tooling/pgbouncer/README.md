# PgBouncer Template

This directory contains the repo-owned PgBouncer baseline for M11.7.

Use it when:

- `DATABASE_POOLER_URL` points the API at a PgBouncer listener on port `6432`
- direct migrations and seeds still use `DATABASE_URL`
- `DATABASE_POOL_MAX` caps the app-side postgres-js pool behind PgBouncer

Recommended validation:

1. Start PgBouncer with `pgbouncer.ini` and `userlist.txt`.
2. Point `DATABASE_POOLER_URL` at the pooler.
3. Run `show pools;`, `show stats;`, and `show clients;`.
4. Capture a `perf:autocannon` run before and after the pooler switch.
