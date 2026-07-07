# EcoTrack Mobile Design

## Principles
- Bottom tabs are the primary navigation for citizen screens. Do not duplicate tab navigation inside Profile.
- Cards group one subject only. Keep them flat, compact, and bordered; avoid heavy shadows or oversized rounded corners.
- Screens should match their tab label:
  - Home: overview and shortcuts.
  - Report: map, select, submit.
  - Challenges: citizen goals only.
  - History: report history only, loaded as an incremental timeline without filters or page controls.
  - Schedule: reminders and nearby service.
  - Profile: identity, gamification, and impact.
- Notification permission is requested in context, from Schedule reminders, after the user taps an explicit action.

## References
- Material Design navigation bar: https://m3.material.io/components/navigation-bar/guidelines
- Material Design cards: https://m3.material.io/components/cards/guidelines
- Android notification runtime permission and contextual permission requests: https://developer.android.com/develop/ui/compose/notifications/notification-permission
