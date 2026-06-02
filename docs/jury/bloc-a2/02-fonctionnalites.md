---
layout: default
title: "Bloc A2 - Fonctionnalités"
---

# Bloc A2 - Preuves fonctionnelles

<nav class="proof-nav">
  <a href="{{ '/jury/bloc-a2/' | relative_url }}">Retour Bloc A2</a>
  <a href="{{ '/jury/bloc-a2/annexe-preuves.html' | relative_url }}">Annexe preuves</a>
  <a href="{{ '/index.html' | relative_url }}">Accueil documentation</a>
</nav>

Cette page rattache les preuves `A2-FUNC-*` aux parcours visibles dans EcoTrack. Les captures démontrent les écrans fournis ; les liens GitHub renvoient aux sources applicatives et API associées.

<a id="a2-func-01"></a>
## A2-FUNC-01: Signalement citoyen

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La preuve montre un parcours de signalement citoyen avec page de saisie, formulaire rempli et confirmation de soumission.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-01-citizen-report-page.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-01-citizen-report-page.png' | relative_url }}) | Page de signalement citoyen avant saisie. |
| [A2-FUNC-01-citizen-report-form-filled.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-01-citizen-report-form-filled.png' | relative_url }}) | Formulaire citoyen renseigné avec les informations de signalement. |
| [A2-FUNC-01-citizen-report-success.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-01-citizen-report-success.png' | relative_url }}) | Message de confirmation indiquant que le signalement a été soumis. |

**Liens source**
- [app/src/pages/CitizenReportPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/CitizenReportPage.tsx)
- [app/src/hooks/useCitizen.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/hooks/useCitizen.tsx)
- [api/src/modules/reports/citizen-reports.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.controller.ts)
- [api/src/modules/reports/citizen-reports.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.service.ts)
- [mobile/src/features/reports/ReportScreen.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/src/features/reports/ReportScreen.tsx)

**Lecture jury**  
Ce parcours relie le besoin citoyen à une donnée exploitable par le système : un problème de collecte est saisi, soumis et confirmé à l'utilisateur.

<a id="a2-func-02"></a>
## A2-FUNC-02: Suivi citoyen, profil et gamification

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve documente les écrans de suivi citoyen après signalement : historique, profil et gamification.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-02-citizen-history.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-02-citizen-history.png' | relative_url }}) | Historique citoyen permettant de suivre les signalements. |
| [A2-FUNC-02-citizen-profile.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-02-citizen-profile.png' | relative_url }}) | Profil citoyen et informations associées au compte. |
| [A2-FUNC-02-gamification.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-02-gamification.png' | relative_url }}) | Écran de progression ou d'engagement citoyen. |

**Liens source**
- [app/src/pages/CitizenProfilePage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/CitizenProfilePage.tsx)
- [app/src/pages/CitizenChallengesPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/CitizenChallengesPage.tsx)
- [mobile/src/features/history/HistoryScreen.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/src/features/history/HistoryScreen.tsx)
- [mobile/src/features/profile/ProfileScreen.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/src/features/profile/ProfileScreen.tsx)
- [api/src/modules/citizen/citizen.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/citizen/citizen.controller.ts)
- [api/src/modules/gamification/gamification.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/gamification/gamification.controller.ts)

**Lecture jury**  
Ces pièces montrent que le citoyen ne se limite pas à créer un signalement : il dispose aussi d'écrans de suivi et de progression.

<a id="a2-func-03"></a>
## A2-FUNC-03: Parcours agent

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre la consultation d'une tournée agent, le détail opérationnel et la validation de collecte.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-03-agent-tours-list.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-03-agent-tours-list.png' | relative_url }}) | Liste des tournées accessibles à l'agent. |
| [A2-FUNC-03-agent-tour-details.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-03-agent-tour-details.png' | relative_url }}) | Détail de tournée et informations terrain utiles. |
| [A2-FUNC-03-agent-collect-validation.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-03-agent-collect-validation.png' | relative_url }}) | Action de validation de collecte par l'agent. |

**Liens source**
- [app/src/pages/AgentTourPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/AgentTourPage.tsx)
- [app/src/hooks/useAgentTours.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/hooks/useAgentTours.tsx)
- [app/src/components/agent/AgentRouteMap.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/components/agent/AgentRouteMap.tsx)
- [api/src/modules/collections/tours.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/collections/tours.controller.ts)
- [api/src/modules/collections/tours.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/collections/tours.service.ts)
- [mobile/src/features/agent/AgentHomeScreen.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/src/features/agent/AgentHomeScreen.tsx)

**Lecture jury**  
Cette preuve documente la boucle terrain : l'agent consulte sa tournée, lit le détail et réalise une action opérationnelle.

<a id="a2-func-04"></a>
## A2-FUNC-04: Parcours gestionnaire

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve documente les écrans gestionnaire : dashboard, indicateurs, tickets, rapports et planification de tournée.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-04-manager-dashboard.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-04-manager-dashboard.png' | relative_url }}) | Tableau de bord gestionnaire. |
| [A2-FUNC-04-manager-kpis.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-04-manager-kpis.png' | relative_url }}) | Indicateurs opérationnels visibles pour le pilotage. |
| [A2-FUNC-04-manager-tickets.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-04-manager-tickets.png' | relative_url }}) | Vue de tickets ou files de traitement. |
| [A2-FUNC-04-manager-reports.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-04-manager-reports.png' | relative_url }}) | Écran de rapports gestionnaire. |
| [A2-FUNC-04-manager-tour-planning.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-04-manager-tour-planning.png' | relative_url }}) | Planification de tournée ou optimisation opérationnelle. |

**Liens source**
- [app/src/pages/Dashboard.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/Dashboard.tsx)
- [app/src/pages/ManagerPlanningPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/ManagerPlanningPage.tsx)
- [app/src/pages/ManagerReportsPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/ManagerReportsPage.tsx)
- [app/src/pages/ManagerToursPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/ManagerToursPage.tsx)
- [api/src/modules/dashboard/dashboard.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/dashboard/dashboard.controller.ts)
- [api/src/modules/routes/planning.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/routes/planning.controller.ts)
- [api/src/modules/tickets/tickets.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/tickets/tickets.controller.ts)

**Lecture jury**  
Le gestionnaire dispose d'une vision de pilotage et d'outils pour prioriser, planifier et suivre l'activité.

<a id="a2-func-05"></a>
## A2-FUNC-05: Parcours administrateur

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre le centre d'administration, les utilisateurs et la gestion de rôles.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-05-admin-center.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-05-admin-center.png' | relative_url }}) | Centre d'administration EcoTrack. |
| [A2-FUNC-05-admin-users.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-05-admin-users.png' | relative_url }}) | Vue de gestion des utilisateurs. |
| [A2-FUNC-05-admin-roles.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-05-admin-roles.png' | relative_url }}) | Vue de gestion ou consultation des rôles. |

**Liens source**
- [app/src/pages/AdminDashboard.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/AdminDashboard.tsx)
- [app/src/components/admin/UserManagement.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/components/admin/UserManagement.tsx)
- [app/src/components/admin/UserCreateModal.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/components/admin/UserCreateModal.tsx)
- [api/src/modules/admin/admin.users.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/admin/admin.users.controller.ts)
- [api/src/modules/admin/admin.roles.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/admin/admin.roles.controller.ts)
- [api/src/modules/auth/permissions.guard.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/auth/permissions.guard.ts)

**Lecture jury**  
Ces preuves documentent les fonctions d'administration et les contrôles de rôle associés au périmètre web.

<a id="a2-func-06"></a>
## A2-FUNC-06: Authentification et routage protégé

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre les écrans d'authentification et un accès à une route protégée après connexion.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-06-login-page.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-06-login-page.png' | relative_url }}) | Écran de connexion. |
| [A2-FUNC-06-signup-page.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-06-signup-page.png' | relative_url }}) | Écran de création de compte. |
| [A2-FUNC-06-protected-route.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/A2-FUNC-06-protected-route.png' | relative_url }}) | Route applicative protégée accessible avec un compte authentifié. |

**Liens source**
- [app/src/pages/auth/LoginPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/auth/LoginPage.tsx)
- [app/src/pages/auth/SignupPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/auth/SignupPage.tsx)
- [app/src/routes/guards/RequireAuth.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/routes/guards/RequireAuth.tsx)
- [app/src/routes/AppRouter.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/routes/AppRouter.tsx)
- [api/src/modules/auth/auth.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/auth/auth.controller.ts)
- [api/src/modules/auth/auth.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/auth/auth.service.ts)

**Lecture jury**  
Cette preuve documente la partie transverse qui protège les parcours métier et oriente l'utilisateur selon son rôle.

<a id="a2-func-api-01"></a>
## A2-FUNC-API-01: API health readiness

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La sortie fournie montre un appel `GET /api/health/ready` avec `HTTP_STATUS:200`.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-API-01-health-ready.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/api/A2-FUNC-API-01-health-ready.png' | relative_url }}) | Capture terminal de l'appel health readiness. |
| [A2-FUNC-API-01-health-ready-output.txt]({{ '/assets/proofs/bloc-a2/fonctionnalites/api/A2-FUNC-API-01-health-ready-output.txt' | relative_url }}) | Sortie brute conservant la réponse JSON et le statut HTTP 200. |

**Liens source**
- [api/src/modules/health/health.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/health/health.controller.ts)
- [api/src/modules/health/health.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/health/health.service.ts)

**Lecture jury**  
Cette preuve valide que l'API expose un point de readiness et retourne une réponse exploitable par les contrôles de santé.

<a id="a2-func-api-02"></a>
## A2-FUNC-API-02: Endpoint zones

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La sortie fournie montre un appel `GET /api/zones?page=1&pageSize=5` avec `HTTP_STATUS:200`.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-API-02-zones-endpoint.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/api/A2-FUNC-API-02-zones-endpoint.png' | relative_url }}) | Capture terminal de l'appel zones. |
| [A2-FUNC-API-02-zones-endpoint-output.txt]({{ '/assets/proofs/bloc-a2/fonctionnalites/api/A2-FUNC-API-02-zones-endpoint-output.txt' | relative_url }}) | Sortie brute contenant la liste paginée des zones et le statut HTTP 200. |

**Liens source**
- [api/src/modules/zones/zones.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/zones/zones.controller.ts)
- [api/src/modules/zones/zones.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/zones/zones.service.ts)
- [api/src/modules/zones/zones.repository.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/zones/zones.repository.ts)

**Lecture jury**  
Cette preuve documente un endpoint métier consultable, avec pagination et données de zones retournées.

<a id="a2-func-api-03"></a>
## A2-FUNC-API-03: Endpoint citizen reports

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La sortie fournie montre un appel `GET /api/citizen-reports?page=1&pageSize=5` avec `HTTP_STATUS:200`.

| Pièce | Légende jury |
| --- | --- |
| [A2-FUNC-API-03-reports-endpoint.png]({{ '/assets/proofs/bloc-a2/fonctionnalites/api/A2-FUNC-API-03-reports-endpoint.png' | relative_url }}) | Capture terminal de l'appel citizen reports. |
| [A2-FUNC-API-03-reports-endpoint-output.txt]({{ '/assets/proofs/bloc-a2/fonctionnalites/api/A2-FUNC-API-03-reports-endpoint-output.txt' | relative_url }}) | Sortie brute contenant un signalement citoyen paginé et le statut HTTP 200. |

**Liens source**
- [api/src/modules/reports/citizen-reports.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.controller.ts)
- [api/src/modules/reports/citizen-reports.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.service.ts)
- [api/src/modules/reports/citizen-reports.repository.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.repository.ts)

**Lecture jury**  
Cette preuve relie le parcours citoyen à un endpoint API qui restitue les signalements enregistrés.
