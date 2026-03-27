# Cross-App Design System Contract

Last updated: 2026-03-23

## Scope

The design system is a contract across `app` and `mobile`, not a shared runtime package. That keeps the layer boundary intact:

- `app` keeps browser-native implementations
- `mobile` keeps React Native / Paper-native implementations
- both clients align on names, intent, states, and accessibility expectations

## Implemented Primitive Set

The current baseline standardizes these 10 primitives:

1. Page shell  
   Web: `AppLayout`, `AppStatusScreen`  
   Mobile: `ScreenContainer`, `AppStateScreen`

2. Surface card  
   Web: dashboard panels / operations cards  
   Mobile: `InfoCard`

3. Metric tile  
   Web: dashboard KPI cards / planning KPI cards  
   Mobile: `MetricCard`

4. Primary action button  
   Web: `app/src/components/ui/button.tsx`  
   Mobile: React Native Paper `Button`

5. Secondary or outline action  
   Web: outline button variant  
   Mobile: outlined Paper `Button`

6. Status pill or badge  
   Web: `app/src/components/ui/badge.tsx`, dashboard status pills  
   Mobile: `Chip`-based status presentation in citizen flows

7. Empty state  
   Web: dashboard and operations empty-state panels  
   Mobile: `AppStateScreen` and empty `InfoCard` blocks

8. Inline feedback or notice  
   Web: toast + error fallback + operations status surfaces  
   Mobile: `HelperText` and notification cards in settings/history

9. Bottom sheet or modal surface  
   Web: `app/src/components/ui/sheet.tsx`  
   Mobile: `BottomSheet`

10. Identity shell  
    Web: `BrandLogo`, account header slot  
    Mobile: `AppLogoMark`, `ProfileAvatar`

## Real Reuse Coverage

Web reuse now appears in:

- manager dashboard: KPI tiles, admin panel, heatmap filters, ticket feed, skeleton panels
- manager planning: shared operations-card structure plus centralized planning workflow state

Mobile reuse now appears in:

- settings: `ScreenContainer`, `InfoCard`, notification status blocks
- history: `ScreenContainer`, `InfoCard`, filter chips, notification-open state
- report flow: `ScreenContainer`, `InfoCard`, `BottomSheet`, chips, status cards

## Documentation Strategy

Instead of adding Storybook as a new runtime dependency immediately, the repo uses:

- documented primitive inventory in this file
- real-screen reuse in both clients
- existing automated tests around web and mobile UI helpers
- validation through `lint`, `typecheck`, and test suites in each workspace

This is the current "Storybook or equivalent" path approved for the monorepo phase.

## Accessibility Expectations

- every interactive primitive must preserve keyboard or native accessibility focus behavior
- status and error surfaces must expose readable copy, not icon-only meaning
- responsive shell primitives must keep desktop and mobile navigation legible at all supported widths
- push and toast surfaces must present meaningful text without relying on color alone
