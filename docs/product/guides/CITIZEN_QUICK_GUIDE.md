# Citizen Quick Guide

## Goal

Report container issues, track personal impact, and join community challenges.

## Main routes

- Report a container issue: `/app/citizen/report`
- Profile and impact: `/app/citizen/profile`
- Challenges: `/app/citizen/challenges`

## Typical flow

1. Open `Citizen Report`, use search or the floating GPS map control to locate a mapped container, review the color-coded fill progress (green under 50%, warning at 50-75%, red above 75%), and tap a container from GPS-ranked shortcuts, search results, nearby lists, map markers, or offscreen arrows to recenter on it and open its info popup instantly. The popup stays open until you tap elsewhere or choose another container, and it only shows the container name plus its progress tag. Container labels use the `address - waste stream` convention so the selected site is easy to verify.
2. Once a container is selected, review its latest status/fill context, choose the matching issue type, and then submit optional details, location, and photo evidence.
3. If you add photo evidence before live location is available, the composer keeps the photo and prompts you to refresh location before final submit.
4. Confirm the success message after submission. If the same typed issue was already reported by another citizen recently, EcoTrack records your confirmation without spamming a second manager alert.
5. Open `Citizen Profile` to review points, badges, and history.
6. Open `Citizen Challenges` to enroll and track progress.

## Related APIs

- `POST /api/citizen/reports`
- `GET /api/citizen/profile`
- `GET /api/citizen/history`
- `GET /api/citizen/challenges`
