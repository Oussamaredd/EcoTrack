# Seed Data Policy

Last updated: 2026-05-08

## Purpose

`database/seeds/index.ts` is reserved for bootstrap and reference data only.

The seed process must not create fake operational records that look like production data.

## Seeded Data Allowed

The seed file may create or update:

- identity roles and local smoke-test users
- system settings
- operating zones
- zone depot metadata
- container types
- default alert rules
- anomaly type catalog
- challenge catalog

## Seeded Data Not Allowed

The seed file must not create demo records for:

- containers
- sensor devices
- IoT measurements
- tours or tour stops
- collection events
- citizen reports
- anomaly reports
- alert events
- notifications
- notification deliveries
- support tickets and comments

## Container Data Rule

Containers are real operational data.

They must be inserted through the application workflow, an explicit import script, or a reviewed SQL import. They must not be created by `db:seed`.

## Rationale

The project now uses Supabase/managed PostgreSQL with real operational data. Seeding fake containers such as `CTR-*` risks polluting production-like environments and confusing API/dashboard validation.

Zones and container types remain seeded because they are reference/master data required before real containers can be imported.
