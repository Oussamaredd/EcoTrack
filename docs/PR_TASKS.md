# PR Tasks - DB Schema Namespace Rollout

Last updated: 2026-03-03

Related planning doc:

- `docs/DB_SCHEMA_NAMESPACE_PLAN.md`

## Current Readiness Status

Current repo status: `IMPLEMENTED IN DIRTY WORKTREE - DATABASE AND API VALIDATION PASSED WITH KNOWN EXCEPTIONS`

Known readiness exceptions from this run:

- The worktree still has broad unrelated local changes across `app`, `api`, `database`, `docs`, environment templates, and `package-lock.json`.
- The implementation was completed in-place at the user's request; the branch is still not isolated from unrelated app/API/UI changes.
- `pg_dump` is not available in this environment, so no pre-migration database backup file was captured in this workspace.
- PostGIS is not installed and not available in the active dev database, so the conditional spatial columns and GiST indexes were intentionally skipped.
- No in-repo runtime dependency on legacy `public.<table>` names was found, so no compatibility views were added.
- The worktree is still not isolated, but the in-scope API layer now compiles, lints, and passes its full test suite against the updated database package.

## Readiness Gate (Must Be Complete Before Implementation Starts)

### Worktree Cleanup And Isolation

- [ ] Decide whether the current local changes should be committed, stashed, or split into a separate branch before DB work starts.
- [x] Remove overlap risk in `database/src/schema.ts` by reconciling existing local edits before the namespace refactor begins.
- [x] Reconcile the current local changes in `database/migrations/meta/_journal.json` before adding any new migrations.
- [x] Decide whether `database/migrations/0011_legal_captain_universe.sql` is a legitimate baseline migration to keep, rename, or replace.
- [x] Decide whether `database/migrations/meta/0011_snapshot.json` is the accepted current baseline snapshot.
- [ ] Confirm the branch used for implementation is isolated from unrelated app/API/UI work.
- [x] Re-run `git status --short` and confirm there are no unresolved merge conflicts.

### Pre-Implementation Baseline

- [x] Treat `docs/DB_SCHEMA_NAMESPACE_PLAN.md` as the approved namespace design baseline.
- [x] Confirm the current 22-table inventory from the latest accepted database snapshot.
- [ ] Confirm no external consumers depend on hardcoded `public.<table>` names, or explicitly list the ones that do.
- [ ] Capture a dev database backup or restore point before any schema move migration is applied.
- [x] Confirm whether PostGIS is already enabled in the dev database.

## Implementation PR Task Checklist

### Task 1 - Phase 0 Inventory And Compatibility Audit

- [x] Search repo runtime code for hardcoded `public.` references.
- [x] Search migration SQL for hardcoded `public.` references.
- [x] Inventory all current business tables by schema and row count.
- [x] Confirm the expected target schema for each of the 22 current tables.
- [x] Identify any raw SQL, scripts, or manual queries that assume `public`.
- [x] Document whether a temporary compatibility layer will be needed.

### Task 2 - Drizzle Namespace Refactor In Source

- [x] Add `pgSchema()` definitions for `auth`, `core`, `iot`, `ops`, `incident`, `notify`, `game`, `audit`, `admin`, `export`, and `support`.
- [x] Move `users`, `password_reset_tokens`, `roles`, and `user_roles` to `auth`.
- [x] Move `zones` and `containers` to `core`.
- [x] Move `tours`, `tour_stops`, `tour_routes`, and `collection_events` to `ops`.
- [x] Move `citizen_reports`, `anomaly_types`, and `anomaly_reports` to `incident`.
- [x] Move `gamification_profiles`, `challenges`, and `challenge_participations` to `game`.
- [x] Move `audit_logs` to `audit`.
- [x] Move `system_settings` to `admin`.
- [x] Move `report_exports` to `export`.
- [x] Move `tickets`, `comments`, and `attachments` to `support`.
- [x] Update all Drizzle relations so cross-schema references still compile cleanly.

### Task 3 - Manual Migration For Schema Moves

- [x] Create one hand-authored migration that creates all target schemas.
- [x] Add `ALTER TABLE ... SET SCHEMA ...` statements for all 22 existing tables.
- [x] Verify cross-schema foreign keys remain valid after table moves.
- [x] Ensure the migration does not drop and recreate tables unnecessarily.
- [x] Keep `public` empty of business tables after the move unless compatibility views are explicitly required.

### Task 4 - Add Missing CDC-Scope Tables

- [x] Add `core.container_types`.
- [x] Add `iot.sensor_devices`.
- [x] Add `iot.measurements`.
- [x] Add `admin.alert_rules`.
- [x] Add `incident.alert_events`.
- [x] Add `notify.notifications`.
- [x] Add `notify.notification_deliveries`.
- [x] Add only OLTP storage/query structures; do not add DW, ETL, ML, or ingestion pipeline artifacts.

### Task 5 - Additive Changes To Existing Tables

- [ ] Add `boundary_geom` to `core.zones` if PostGIS is enabled. (Blocked: PostGIS is unavailable in the active dev database.)
- [ ] Add `location_geom` and `container_type_id` to `core.containers`. (Partial: `container_type_id` added; `location_geom` skipped because PostGIS is unavailable.)
- [x] Decide whether `latitude` and `longitude` remain temporarily during backfill.
- [ ] Add `route_geom` to `ops.tour_routes` if PostGIS is enabled. (Blocked: PostGIS is unavailable in the active dev database.)
- [x] Add `started_at` and `completed_at` to `ops.tours`.
- [x] Keep helpdesk tables isolated in `support` and do not fold them into CDC core domains.
- [x] Keep `support.attachments` intact; only note optional later reuse for incident media.

### Task 6 - Optional Compatibility Layer (Only If Needed)

- [x] Confirm whether any real dependency still requires legacy `public.<table>` names.
- [x] If needed, add temporary read-only `public` views for legacy consumers. (Not needed; none were added.)
- [x] Do not add writable compatibility triggers unless there is a proven blocker.
- [x] Define a deprecation window for the compatibility views. (Not needed; no compatibility views were added.)
- [x] Add a removal task for those views in the next database cleanup PR. (Not needed; no compatibility views were added.)

### Task 7 - Indexes, Partitioning, And Practical Constraints

- [x] Add only operational indexes needed for dashboard and API queries.
- [x] Add composite indexes aligned with filter and sort patterns for active alerts, latest measurements, active tours, and export history.
- [x] Add GiST indexes for geometry columns if PostGIS columns are introduced. (Not applicable in this pass; no PostGIS columns were introduced.)
- [x] Design `iot.measurements` for monthly range partitioning on `measured_at`.
- [x] Avoid broad retrofitting of PostgreSQL enums during the namespace move.
- [x] Keep status fields practical: use app enums or narrow checks first, DB enums only where stable.

### Task 8 - Snapshot, Migration Metadata, And Validation

- [x] Refresh the Drizzle snapshot only after source definitions and manual migration SQL are aligned.
- [x] Update migration journal metadata only after migration order is final.
- [x] Run `npm run build --workspace=ecotrack-database`.
- [x] Run `npm run typecheck --workspace=ecotrack-database`.
- [x] Run `npm run db:migrate --workspace=ecotrack-database`.
- [x] Verify no business tables remain in `public`.
- [x] Verify row counts match before and after the schema move.
- [x] Verify representative inserts and reads for `auth`, `ops`, `incident`, `notify`, and `iot`.

### Task 9 - App And API Smoke Validation After DB Cutover

Database smoke validation is complete, and the API layer has now passed compile, lint, and test validation against the updated database package.

- [x] Verify auth login and role-protected routes still work.
- [x] Verify citizen report creation still persists successfully.
- [x] Verify tour creation, assignment, start, and stop validation still persist.
- [x] Verify anomaly reporting still persists and can be queried.
- [x] Verify manager dashboard reads still return containers, alerts, and report exports.
- [x] Verify support tickets, comments, and attachments still work with the isolated `support` schema.

## PR Exit Criteria

- [ ] Worktree was clean or intentionally isolated before schema implementation started.
- [x] Namespace refactor matches `docs/DB_SCHEMA_NAMESPACE_PLAN.md`.
- [x] Required new in-scope tables are present.
- [x] No out-of-scope DW/ETL/ML/cyber artifacts were added.
- [x] Database migration path is hand-authored where needed and reviewable.
- [x] Required database validation commands passed.
- [x] App/API smoke checks passed after cutover.
- [x] Any temporary `public` compatibility views are documented with a removal deadline. (No compatibility views were needed.)
