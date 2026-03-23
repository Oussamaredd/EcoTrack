# ADR-0002 Frontend State Architecture

Status: Accepted  
Date: 2026-03-23

## Context

The web client already used TanStack Query as its server-state backbone, but shared client workflow state was still leaking into page-local `useState` blocks:

- sidebar collapse and mobile drawer preferences lived only in `AppLayout`
- manager planning draft state lived only in `ManagerPlanningPage`
- dashboard filter and realtime display preferences had no stable shared boundary
- manager notification feed dismissal/highlight state had no dedicated home

This made cross-screen behavior harder to reason about and left React Query invalidation keys duplicated as ad hoc string arrays.

## Decision

Keep TanStack Query as the canonical remote-state layer and add focused client-state slices for cross-screen workflow state.

The accepted boundary is:

- remote state: TanStack Query, centralized in `app/src/state/queryKeys.ts`
- query invalidation: shared helpers in `app/src/state/invalidation.ts`
- auth session slice: existing `AuthProvider`
- app shell/UI preferences slice: `ShellPreferencesProvider`
- manager planning draft slice: `PlanningDraftProvider`
- dashboard/IoT filters plus realtime status slice: `DashboardPreferencesProvider`
- notifications feed slice: `NotificationsFeedProvider`

## Rationale

- React Query already owns caching, polling, and refetch behavior well; replacing it with Redux or Zustand for server state would add duplication.
- The remaining problem space is small, local, and UI-oriented, so Context plus reducer-style state is enough.
- Centralized query keys reduce invalidation drift across polling, mutations, and realtime transports.
- This keeps the monolith client architecture simple while preserving room for future extraction into a dedicated shared client package if app/mobile parity later requires it.

## Consequences

Positive:

- shared UI state now has explicit ownership
- realtime hooks invalidate dashboard, heatmap, tour, and notification queries consistently
- planning draft behavior is reducer-tested instead of implicit in component-local state
- later design-system work can target stable shells instead of page-specific state

Trade-offs:

- more providers exist in the root tree
- auth remains separate from the new app-state providers rather than being fully merged into one reducer
- mobile does not import this runtime code; parity is documented as a contract, not a shared runtime package
