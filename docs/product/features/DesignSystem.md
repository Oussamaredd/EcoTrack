# Cross-App Design System Contract

Last updated: 2026-05-03

## Scope

The design system is a contract across `app` and `mobile`, not a shared runtime package. That keeps the layer boundary intact:

- `app` keeps browser-native implementations
- `mobile` keeps React Native / Paper-native implementations
- both clients align on names, intent, states, and accessibility expectations

## Web Styling Contract

The web app uses semantic tokens from `app/src/index.css` as the source of truth for the authenticated app shell, dashboard, operations pages, support workspace, ticket flows, and auth surfaces. Tailwind mirrors these tokens through `app/tailwind.config.ts` so utility-based components and CSS-authored screens stay aligned.

Current web styling rules:

- App sections, cards, panels, forms, tables, dashboard surfaces, operations surfaces, support surfaces, and ticket surfaces use sharp `0px` corners.
- `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, and `--radius-pill` are currently set to `0px` for a squared product style.
- Reusable surfaces should use `--section-surface`, `--section-surface-strong`, `--section-shadow`, `--surface`, `--surface-strong`, `--border`, `--text`, and `--text-muted` instead of hard-coded section colors.
- Decorative radial glows should stay on the app background, selected/focus states, and intentional primary actions. Normal section cards and panels should not carry green, white, or blue local glow effects.
- Primary actions use `--gradient-primary` and `--shadow-glow`.
- Status colors use semantic intent tokens: success, warning, danger, and info.
- Status meaning must not rely on color alone; visible text remains required for status, error, empty, and loading states.

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

- authenticated app shell: sidebar, toolbar, account surfaces, status screens, access-denied states, and install banners
- dashboard: hero, KPI cards, panels, ticket status surfaces, heatmap containers, empty states, and loading states
- manager, agent, citizen, and admin operations pages: operations heroes, cards, KPI tiles, forms, status messages, chips, map shells, admin panels, and modal surfaces
- support workspace and ticket flows: support tabs, advanced ticket queue, simple ticket queue, create-ticket form, ticket details, treatment workflow, comments, activity timeline, and ticket feedback states
- shared token layer: semantic colors, sharp radius tokens, font tokens, section surfaces, shadows, app gradients, and Tailwind theme aliases

Mobile reuse now appears in:

- settings: `ScreenContainer`, `InfoCard`, notification status blocks
- history: `ScreenContainer`, `InfoCard`, filter chips, notification-open state
- report flow: `ScreenContainer`, `InfoCard`, `BottomSheet`, chips, status cards

## Documentation Strategy

Instead of adding Storybook as a new runtime dependency immediately, the repo uses:

- documented primitive inventory in this file
- real-screen reuse in both clients
- existing automated tests around web and mobile UI helpers
- validation through `lint`, `typecheck`, test suites, `validate-doc-sync`, and the web theme contract check

This is the current "Storybook or equivalent" path approved for the monorepo phase.

## Accessibility Expectations

- every interactive primitive must preserve keyboard or native accessibility focus behavior
- status and error surfaces must expose readable copy, not icon-only meaning
- responsive shell primitives must keep desktop and mobile navigation legible at all supported widths
- push and toast surfaces must present meaningful text without relying on color alone
