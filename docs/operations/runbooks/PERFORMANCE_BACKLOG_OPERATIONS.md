# Performance Backlog Operations

This runbook is the canonical operator guide for the repo-owned M11 performance backlog.

It covers:

- profiling and repeatable benchmark commands
- API, browser, and CDN cache behavior
- PostgreSQL index and plan baselines
- compression, PWA, and frontend asset-delivery controls
- PgBouncer, HAProxy, Kubernetes, and Cloudflare templates

## M11.1 Profiling and Benchmarks

Root commands:

```bash
npm run perf:autocannon -- --url http://localhost:3001/api/health/ready --scenario health-ready
npm run perf:clinic:doctor
npm run perf:clinic:flame
npm run perf:clinic:bubbleprof
npm run perf:clinic:heapprofiler
```

Artifacts are written under:

- `tmp/performance/autocannon`
- `tmp/performance/clinic/<mode>`

Recommended workflow:

1. Build the API first with `npm run build --workspace=ecotrack-api`.
2. Start the API against a representative dataset.
3. Run `perf:autocannon` against a read-heavy endpoint such as `/api/dashboard`, `/api/planning/dashboard`, or `/api/analytics/summary`.
4. Run the relevant Clinic mode and keep the generated HTML report with the matching autocannon JSON.
5. Record before/after numbers in the roadmap evidence note before closing a tuning change.

The default Clinic load command already drives a readiness endpoint through autocannon. Override it with `--on-port` when profiling a specific route.

## M11.2 Multi-Layer Caching

API read caching now ships as:

- L1 in-memory cache through `api/src/modules/performance/cache.service.ts`
- optional L2 Redis cache through `CACHE_REDIS_URL`
- response cache headers through `@ResponseCache(...)`
- browser and CDN cache headers for static assets through `app/public/_headers` and `app/nginx.conf`

Current cached API surfaces:

- `/api/dashboard`
- `/api/planning/dashboard`
- `/api/planning/heatmap`
- `/api/planning/alerts`
- `/api/planning/notifications`
- `/api/planning/reports/history`
- `/api/planning/reports/:reportId/download`
- `/api/citizen/profile`
- `/api/citizen/history`
- `/api/citizen/challenges`
- `/api/citizen/notifications`
- `/api/analytics/summary`
- `/api/analytics/zones/current`
- `/api/analytics/zones/aggregates`

Invalidation is wired into write paths for:

- citizen report and notification updates
- ticket and ticket-comment mutations
- planning alerts, emergency collections, and report generation
- analytics projection refreshes

Observe cache behavior through `GET /api/metrics`, which now exposes:

- `ecotrack_cache_reads_total`
- `ecotrack_cache_writes_total`
- `ecotrack_cache_invalidations_total`
- `ecotrack_cache_backend_up`
- `ecotrack_event_loop_delay_ms`

## M11.3 PostgreSQL Plans and Index Baselines

The index pack for this closure is in `database/migrations/0024_hard_bullseye.sql`.

It adds read-path indexes for:

- `incident.citizen_reports` by `(container_id, reported_at)`
- `incident.citizen_reports` by `(reporter_user_id, status, reported_at)`
- `notify.notifications.created_at`
- `notify.notification_deliveries` by `(notification_id, created_at)`
- `analytics.zone_current_state.updated_at`

Use the SQL baseline pack in `infrastructure/performance/postgresql`:

```bash
psql "$DATABASE_URL" -f infrastructure/performance/postgresql/enable-pg-stat-statements.sql
psql "$DATABASE_URL" -f infrastructure/performance/postgresql/top-sql.sql
psql "$DATABASE_URL" -f infrastructure/performance/postgresql/dashboard-explain-analyze.sql
psql "$DATABASE_URL" -f infrastructure/performance/postgresql/planning-heatmap-explain-analyze.sql
psql "$DATABASE_URL" -f infrastructure/performance/postgresql/citizen-profile-explain-analyze.sql
psql "$DATABASE_URL" -f infrastructure/performance/postgresql/analytics-zone-current-explain-analyze.sql
npm run perf:pgbench -- --database-url "$DATABASE_URL"
```

Store captured output under `tmp/performance/postgresql` or `tmp/performance/pgbench`.

## M11.4 Transport Compression and Asset Delivery

API compression is enabled by default through `compression` middleware in `api/src/main.ts`.

Important behavior:

- SSE at `/api/planning/stream` is excluded from compression
- compression can be disabled with `RESPONSE_COMPRESSION_ENABLED=false`
- threshold and level are controlled by `RESPONSE_COMPRESSION_THRESHOLD_BYTES` and `RESPONSE_COMPRESSION_LEVEL`

Frontend edge behavior now aligns across:

- Docker Nginx: `app/nginx.conf`
- Cloudflare Pages headers: `app/public/_headers`

Static assets use long-lived cache headers, while:

- `index.html` stays revalidated
- `manifest.json` stays short-lived and revalidated
- `ecotrack-map-sw.js` stays `no-cache`

HTTP/2 and Brotli ownership is split intentionally:

- Docker local edge provides gzip and cache headers
- HAProxy and Cloudflare templates document HTTP/2 and Brotli edge ownership for deployed environments

## M11.5 and M11.6 Frontend Delivery and PWA

Frontend performance closure includes:

- route and dashboard-panel code splitting
- responsive logo assets with `srcset` and `sizes`
- `loading=\"lazy\"` and async image decoding where applicable
- a real `manifest.json`
- install prompt UI via `InstallAppBanner`
- service-worker app-shell and static-asset precache
- background sync tag `ecotrack-refresh-shell`
- push and notification click handling

Validation surface:

- `app/src/tests/ecotrack-map-sw.test.ts`
- `app/src/tests/registerMapServiceWorker.test.tsx`

## M11.7 PgBouncer

Repo-owned PgBouncer assets live in `infrastructure/tooling/pgbouncer`.

Runtime contract:

- `DATABASE_URL` stays the direct database URL for migrations and seeds
- `DATABASE_POOLER_URL` is the optional runtime URL for API traffic through PgBouncer
- `DATABASE_POOL_MAX` caps the application-side postgres-js pool

Use PgBouncer with:

1. `infrastructure/tooling/pgbouncer/pgbouncer.ini`
2. `infrastructure/tooling/pgbouncer/userlist.txt.example`
3. the README in the same directory

## M11.8 and M11.9 Edge and Horizontal Scaling Templates

Repo-owned scaling templates live in:

- `infrastructure/tooling/haproxy`
- `infrastructure/tooling/kubernetes/performance`

They provide:

- HAProxy round-robin balancing with `/healthz` checks and stats
- a Kubernetes `Deployment`, `Service`, `HPA`, `PDB`, `ServiceMonitor`, and optional KEDA `ScaledObject`

These are templates, not committed live-cluster state. Apply environment-specific addresses, images, TLS material, and namespaces before rollout.

## M11.10 Cloudflare CDN Operations

Required env vars for purge automation:

- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN`

Purge commands:

```bash
npm run perf:cloudflare:purge -- --everything
npm run perf:cloudflare:purge -- --files https://app.example.com/manifest.json,https://app.example.com/ecotrack-map-sw.js
npm run perf:cloudflare:purge -- --tags analytics-summary,planning-dashboard
```

Repo-owned Cloudflare delivery controls include:

- edge/browser cache headers in `app/public/_headers`
- CDN-aware API headers on public analytics endpoints
- the purge script in `infrastructure/scripts/performance/purge-cloudflare-cache.mjs`

Provider-specific tasks still happen in the Cloudflare zone:

- DNS and proxy enablement
- Brotli, HTTP/3, and minify toggles
- zone analytics review
- token and permission management

## Proof of Done

Before marking a performance change complete:

1. Run the scoped validations for changed workspaces.
2. Capture benchmark or plan evidence under `tmp/performance`.
3. Update the canonical docs and the M11 roadmap/workbook status in the same change.
