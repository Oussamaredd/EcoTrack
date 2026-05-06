# Citizen Quick Guide

## Goal

Report container issues, follow what happened afterward, and join community challenges.

EcoTrack is mobile-first for citizens. The web citizen flow remains available as a companion, demo, testing, and accessibility surface when mobile-only device features are unavailable.

## Main routes

- Shared citizen entry: `/app`
- Report a container issue: `/app/citizen/report`
- Profile and impact: `/app/citizen/profile`
- Challenges: `/app/citizen/challenges`

## Typical flow

1. After sign-in, open `/app`. EcoTrack shows the shared role hub with citizen-specific onboarding copy, then routes the `Citizen Reporting` action to the report flow.
2. Open `Citizen Reporting`. If the reporting backend or mapped-container context is still starting, EcoTrack shows the shared `Loading EcoTrack` screen first; this means the feature is loading, not that reporting is forbidden.
3. Locate an existing mapped container, review the latest known status or fill context, and submit the matching typed issue. On web, GPS is optional; if location is unavailable, continue with manual mapped-container selection.
4. Confirm the success message after submission. If the same typed issue was already reported by another citizen recently, EcoTrack records your confirmation against the existing signal instead of creating a duplicate manager alert.
5. Return to `/app` for the role-aware citizen lane, then open `Impact & History` to review report status, resolved-report totals, and current follow-up visibility.
6. Open `Citizen Challenges` to enroll and track progress.

## Current feedback-loop truth

- The current web citizen follow-up surface shows the report confirmation, history status, and resolved-report totals.
- Prototype impact estimates are visible, but they are still seeded/prototype calculations rather than proof from deployed hardware.
- Direct route or tour linkage is not yet exposed to citizens; `Impact & History` is the nearest truthful follow-up surface today.

## Related APIs

- `POST /api/citizen/reports`
- `GET /api/citizen/profile`
- `GET /api/citizen/history`
- `GET /api/citizen/challenges`
