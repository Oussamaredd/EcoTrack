# PostgreSQL Performance Baselines

Use these SQL files with `psql` against a development or staging clone before and after index or query changes.

Recommended flow:

1. Enable `pg_stat_statements`.
2. Capture the top cumulative statements.
3. Run the `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` baselines for the EcoTrack hot paths.
4. Run `npm run perf:pgbench -- --database-url "<DATABASE_URL>"`.
5. Save the output in `tmp/performance/postgresql/` and attach the deltas to the roadmap evidence.
