# Internal Domain Events

## Overview

Module `M8` is implemented as a Development-owned internal event boundary inside the modular monolith. Instead of deploying Kafka brokers in this phase, EcoTrack uses typed internal event contracts, durable PostgreSQL storage, replay-safe workers, and explicit adapter points so the same domains can be externalized later without rewriting business logic.

The implemented scope covers:

- IoT validated-event fan-out with five authorized consumers.
- Event-sourced collection-tour commands backed by immutable domain events and snapshots.
- CQRS-style separation between command handlers and query services in the collections domain.
- Zone analytics and anomaly-alert projections derived from validated IoT measurements.
- Archive-style connector exports staged in the database and materialized as JSON files for future sink replacement.
- Internal schema-registry subjects and compatibility checks for the active event contracts.
- DB-backed metrics, Grafana dashboards, Alertmanager rules, and replay runbooks for the event pipeline.

## Collections Command Side

Collections write flows now go through `ToursCommandService` and `CollectionsDomainRepository` instead of directly mutating `ops.tours` and `ops.tour_stops`.

Command results are persisted in:

- `ops.collection_domain_events`
- `ops.collection_domain_snapshots`

The command-side flow emits immutable events for:

- `collections.tour.scheduled`
- `collections.tour.updated`
- `collections.tour.started`
- `collections.stop.validated`
- `collections.tour.completed`
- `collections.tour.cancelled`

Planning-created tours also seed the same scheduled-tour domain state so route planning does not bypass the event store.

## Collections Query Side

Collections reads now remain isolated in `ToursQueryService` and the existing read-model tables:

- `ops.tours`
- `ops.tour_stops`
- `ops.tour_routes`
- `ops.collection_events`

That keeps the controller and service boundary aligned with CQRS inside the monolith:

- command side: validates invariants, appends domain events, updates snapshots, advances projections
- query side: serves agent and manager reads from projection tables optimized for HTTP access

## Analytics and Connector Projections

Validated IoT events currently fan out to these authorized consumers:

- `timeseries_projection`
- `measurement_rollup_projection`
- `zone_analytics_projection`
- `anomaly_alert_projection`
- `event_archive_connector`

Additional M8 read models are persisted in:

- `analytics.zone_aggregates_10m`
- `analytics.zone_current_state`
- `integration.event_connector_exports`

The analytics projection derives 10-minute per-zone aggregates, updates the current-state table, and stages `analytics.zone.aggregate.10m` exports for future external sinks.

The anomaly-alert projection now creates idempotent alert events for:

- high temperature
- low battery
- fill-level surge

The archive connector currently writes export artifacts under the local runtime temp directory. That keeps the sink contract replaceable while still giving Development a real durable connector path and retry semantics today.

## Internal Schema and Policy Surface

The internal schema registry now covers both IoT and business-domain event subjects, including collections events and zone-aggregate events. Producer and consumer authorization is enforced by policy before the monolith accepts a domain event emission or delivery projection.

This phase intentionally stops at monolith-internal policy enforcement. External broker ACLs, TLS, and SASL remain future adapter-layer work outside the current scope freeze.

## Verification

- `npm run build --workspace=ecotrack-database`
- `npm run typecheck --workspace=ecotrack-database`
- `npm run db:migrate --workspace=ecotrack-database`
- `npm run lint --workspace=ecotrack-api`
- `npm run typecheck --workspace=ecotrack-api`
- `npm run test --workspace=ecotrack-api`
- `npm run validate-doc-sync`
