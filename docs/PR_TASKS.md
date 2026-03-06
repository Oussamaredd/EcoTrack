# PR Tasks - Deployment Platform Rollout

Last updated: 2026-03-06

## Related Planning Docs

- `docs/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md`
- `docs/ENV.md`
- `docs/ENVIRONMENT_SETUP.md`
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/DB_SCHEMA_NAMESPACE_STATUS.md` for the preserved status of the previous DB namespace rollout checklist

## Current Readiness Status

Current repo status: `PARTIAL IMPLEMENTATION - PHASES 2 AND 3 COMPLETE`

Completed in this documentation pass:

- the target deployment stack is now documented as Cloudflare Pages for the frontend, Render for the monolith backend, and Neon for managed Postgres
- the GitHub Pages app retirement path is now documented
- future GitHub Pages reuse is now explicitly limited to docs-only follow-up work
- future PostGIS enablement is now explicitly deferred and scoped as a separate phase
- the deployment rollout plan is now linked from the docs index
- the live GitHub Pages app site has been unpublished
- `.github/workflows/CD.yml` no longer deploys the app to GitHub Pages
- the `github-pages` environment is no longer part of the app release path
- repo deployment notes no longer describe GitHub Pages as an app target
- Neon is now provisioned as the managed deployment database baseline in `aws-eu-central-1` (Frankfurt)
- the canonical `ticketdb` managed database is created on the single baseline branch
- the repo Drizzle migration chain and existing seed strategy have been validated against Neon
- local API readiness has been validated against the direct Neon connection string

Still not done:

- Cloudflare Pages has not yet been configured for the frontend
- Render has not yet been configured for the backend runtime
- deployed public origins, OAuth callback values, and CORS allowlists have not yet been cut over
- the first deployed validation pass has not yet been executed

## Task 0 - Planning Baseline And Documentation

Description:

This task covers the planning work completed in this pass. It records the target stack, the rollout order, and the later follow-up boundaries so implementation can proceed without revisiting the hosting decision.

- [x] Define the target hosting split for frontend, backend, and database.
- [x] Exclude Cloudflare Workers from the current runtime plan.
- [x] Record GitHub Pages as docs-only follow-up work instead of live app hosting.
- [x] Record PostGIS as a later scoped database change rather than part of the first rollout.
- [x] Add a dedicated deployment rollout plan markdown file under `docs/runbooks/`.
- [x] Ensure the docs index points to the rollout plan and to this active PR task file.

## Task 1 - Freeze Deployment Ownership

Description:

This task confirms one canonical host per layer before any platform setup starts. The implementation team should not proceed while frontend or backend ownership is still ambiguous.

- [x] Decide that the live frontend host will be Cloudflare Pages.
- [x] Decide that the monolith backend host will be Render.
- [x] Decide that the deployment database host will be Neon.
- [x] Decide that GitHub Pages will not remain the live app host.
- [ ] Record final team sign-off on the deployment ownership split if formal approval is required.

## Task 2 - Retire GitHub Pages As The App Host

Description:

This task removes GitHub Pages from the main app release path while keeping future docs-only hosting possible.

- [x] Unpublish the current GitHub Pages app site if it is still active.
- [x] Disable or replace the app-facing GitHub Pages release path in `.github/workflows/CD.yml`.
- [x] Remove the main app dependency on the `github-pages` environment.
- [x] Confirm no active frontend links, OAuth entries, or deployment notes still point at GitHub Pages for the app.
- [x] Preserve GitHub Pages only as a later docs-hosting option.

## Task 3 - Provision Neon Managed Postgres

Description:

This task creates the deployment-ready managed Postgres baseline without changing the local Docker development database role.

- [x] Create the Neon project for EcoTrack.
- [x] Create the managed deployment database using the canonical `ticketdb` naming.
- [x] Store the managed `DATABASE_URL` outside the repository.
- [x] Define the migration policy for deployed environments.
- [x] Define whether demo data uses seed scripts or a one-time import.
- [x] Document that local Docker Postgres is a dev sandbox and not a live-synced peer of Neon.

## Task 4 - Provision Render For The Monolith Backend

Description:

This task prepares the existing Nest runtime to run as one web service with a predictable health check and managed database connection.

- [ ] Create the Render web service for EcoTrack.
- [ ] Choose the monorepo deployment method for the backend service.
- [ ] Resolve the backend service port contract for Render.
- [ ] Configure the Render health check to use `/api/health/ready`.
- [ ] Configure backend deployment secrets and public runtime env values.
- [ ] Define how migrations will be executed as part of deployment.

## Task 5 - Provision Cloudflare Pages For The Frontend

Description:

This task moves the frontend SPA to Cloudflare Pages and removes the old GitHub Pages app-hosting assumption.

- [ ] Create the Cloudflare Pages project.
- [ ] Confirm the project is configured as Pages and not Workers.
- [ ] Configure the frontend-only build command.
- [ ] Configure the output directory as `app/dist`.
- [ ] Align `VITE_BASE` behavior for Cloudflare-hosted deployment.
- [ ] Configure preview deployments for branch or pull-request review where needed.

## Task 6 - Align Public Origins, OAuth, And CORS

Description:

This task stabilizes the public URL contract after the platform targets exist. It should be completed before the final cutover.

- [ ] Finalize the frontend public origin.
- [ ] Finalize the backend public origin.
- [ ] Set the deployed `VITE_API_BASE_URL`.
- [ ] Set `API_BASE_URL`, `APP_URL` or `APP_BASE_URL`, `CORS_ORIGINS`, and `GOOGLE_CALLBACK_URL` for the deployed backend runtime.
- [ ] Confirm no deployment env still references localhost or GitHub Pages for the live app.

## Task 7 - Define Release Order, Migration Discipline, And Rollback

Description:

This task makes the deployment repeatable and reduces the risk of a first-release failure caused by unmanaged database changes.

- [ ] Define the release order across Neon, Render, and Cloudflare Pages.
- [ ] Decide whether migrations are automatic or explicitly triggered during release.
- [ ] Decide where seed data is allowed.
- [ ] Define rollback expectations after a failed deploy.
- [ ] Document the first-release bootstrap process for the managed database.

## Task 8 - Execute Cutover Validation

Description:

This task verifies that the deployed stack behaves correctly after the hosting move.

- [ ] Validate backend readiness on the deployed URL.
- [ ] Validate frontend-to-backend API communication.
- [ ] Validate local auth login and protected-route behavior.
- [ ] Validate Google OAuth callback behavior on deployed origins.
- [ ] Validate one critical citizen flow, one critical agent flow, and one critical manager flow.
- [ ] Validate realtime transport behavior and fallback after deployment.

## Task 9 - Docs-Only GitHub Pages Follow-Up

Description:

This task is intentionally deferred until after the app rollout is stable. It exists so the repo stays ready for future documentation hosting without mixing docs and app deployment concerns.

- [ ] Decide whether GitHub Pages will be re-enabled for docs.
- [ ] Define the docs source and output path.
- [ ] Define the docs-only publish workflow.
- [ ] Define the docs URL strategy separate from the app.

## Task 10 - Future PostGIS Enablement

Description:

This task is intentionally deferred until Development and Data scope require it. It remains listed here so the team does not accidentally absorb PostGIS into the first deployment pass.

- [x] Document that PostGIS is out of scope for the first deployment pass.
- [ ] Open a future implementation task for PostGIS readiness when data-scope work requires it.
- [ ] Confirm the approved geospatial use cases before enabling the extension.
- [ ] Treat PostGIS enablement as a reviewed database migration change.

## PR Exit Criteria For This Planning Pass

- [x] The deployment target stack is documented.
- [x] The rollout is organized into phases with detailed descriptions.
- [x] The docs include a dedicated markdown plan for the rollout.
- [x] `docs/PR_TASKS.md` reflects completed planning work versus open implementation work.
- [x] The docs index includes the new rollout plan and the active PR task tracker.
- [x] Platform configuration has been implemented for the Phase 3 Neon baseline.
- [x] GitHub Pages has been retired as the app host.
- [ ] Cloudflare Pages and Render have been provisioned and validated.
