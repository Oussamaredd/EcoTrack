---
layout: default
title: "Bloc A2 - Fonctionnalités"
---

# Bloc A2 - Preuves fonctionnelles

<nav class="proof-nav">
  <a href="index.md">Retour Bloc A2</a>
  <a href="annexe-preuves.md">Annexe preuves</a>
  <a href="../../index.md">Accueil documentation</a>
</nav>

Cette page prépare les preuves des parcours fonctionnels. Chaque section devra recevoir des captures, chemins de code, exemples d'appels API et références de commit lorsque les preuves seront fournies.

<a id="a2-func-01"></a>
## A2-FUNC-01: Parcours citoyen

**What the proof must show**  
La preuve doit montrer le parcours citoyen de signalement ou de suivi : accès au rôle, sélection du contexte, saisie d'un signalement, confirmation et consultation du suivi lorsque disponible.

**Current repository references**
- [Citizen quick guide](../../product/guides/CITIZEN_QUICK_GUIDE.md)
- [Frontend routes](../../product/FRONTEND_ROUTES.md)
- `app/src/pages/`
- `mobile/src/features/reports/`
- `mobile/src/features/history/`
- `api/src/modules/citizen/`

**Screenshot placeholders**
- Écran d'accueil ou hub citoyen.
- Formulaire ou écran de signalement.
- Confirmation ou historique citoyen.

**Source code path placeholders**
- Chemin exact de la page web citoyenne : à compléter.
- Chemin exact du composant mobile citoyen : à compléter.
- Chemin exact du service/API citoyen : à compléter.

**API endpoint examples to document later**
- `POST /api/citizen/reports`
- `GET /api/citizen/profile`
- `GET /api/citizen/history`

**Jury explanation placeholder**  
À compléter avec une explication reliant le besoin utilisateur citoyen au comportement implémenté et à la donnée produite côté backend.

<div class="placeholder"><strong>Pièces à joindre :</strong> captures du parcours citoyen, chemins de code et exemple d'appel API sans réponse inventée.</div>

<a id="a2-func-02"></a>
## A2-FUNC-02: Parcours agent

**What the proof must show**  
La preuve doit montrer comment un agent accède à sa tournée, consulte les arrêts ou informations utiles, puis réalise une action opérationnelle attendue.

**Current repository references**
- [Agent quick guide](../../product/guides/AGENT_QUICK_GUIDE.md)
- [Frontend routes](../../product/FRONTEND_ROUTES.md)
- `app/src/components/agent/`
- `mobile/src/features/agent/`
- `mobile/src/features/schedule/`
- `api/src/modules/routes/`
- `api/src/modules/tickets/`

**Screenshot placeholders**
- Écran agent ou tournée active.
- Détail d'un arrêt ou d'une action terrain.
- Confirmation ou état mis à jour.

**Source code path placeholders**
- Chemin exact du composant web agent : à compléter.
- Chemin exact du composant mobile agent : à compléter.
- Chemin exact du contrôleur/service backend : à compléter.

**API endpoint examples to document later**
- `GET /api/tours/agent/me`
- Endpoint d'action agent : à compléter après preuve.

**Jury explanation placeholder**  
À compléter avec une explication du rôle agent dans la boucle opérationnelle et des garanties visibles dans l'interface.

<div class="placeholder"><strong>Pièces à joindre :</strong> captures agent, code source précis et exemple d'endpoint utilisé.</div>

<a id="a2-func-03"></a>
## A2-FUNC-03: Parcours gestionnaire

**What the proof must show**  
La preuve doit montrer les fonctions de pilotage : dashboard, planification, tournées, rapports ou autre écran de gestion réellement disponible.

**Current repository references**
- [Manager quick guide](../../product/guides/MANAGER_QUICK_GUIDE.md)
- [Dashboard](../../product/features/Dashboard.md)
- [Frontend routes](../../product/FRONTEND_ROUTES.md)
- `app/src/components/dashboard/`
- `mobile/src/features/manager/`
- `api/src/modules/dashboard/`
- `api/src/modules/routes/`

**Screenshot placeholders**
- Dashboard gestionnaire.
- Planification ou liste de tournées.
- État, indicateur ou rapport exportable si disponible.

**Source code path placeholders**
- Chemin exact de la page dashboard : à compléter.
- Chemin exact de la page planning/tournées : à compléter.
- Chemin exact de l'endpoint backend : à compléter.

**API endpoint examples to document later**
- `GET /api/dashboard`
- `GET /api/planning/agents`
- Endpoint de création ou gestion de tournée : à compléter après preuve.

**Jury explanation placeholder**  
À compléter avec une explication du besoin gestionnaire, de la donnée affichée et du lien avec les décisions opérationnelles.

<div class="placeholder"><strong>Pièces à joindre :</strong> captures gestionnaire, chemins de code et exemple API rattaché au scénario.</div>

<a id="a2-func-04"></a>
## A2-FUNC-04: Parcours administrateur

**What the proof must show**  
La preuve doit montrer les fonctions d'administration disponibles : gestion utilisateurs, rôles, paramètres, audit ou replay selon le périmètre activé.

**Current repository references**
- [Frontend routes](../../product/FRONTEND_ROUTES.md)
- [API documentation](../../api/API_DOCUMENTATION.md)
- `app/src/components/admin/`
- `api/src/modules/admin/`
- `api/src/modules/users/`
- `app/src/tests/UserCreateModal.test.tsx`
- `app/src/tests/SystemSettings.test.tsx`

**Screenshot placeholders**
- Écran ou panneau administrateur.
- Formulaire ou tableau d'administration.
- Message de validation ou état d'audit.

**Source code path placeholders**
- Chemin exact de la page admin : à compléter.
- Chemin exact du composant admin : à compléter.
- Chemin exact du module backend admin : à compléter.

**API endpoint examples to document later**
- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/audit-logs`

**Jury explanation placeholder**  
À compléter avec une explication des droits administrateur, du contrôle d'accès et de la traçabilité attendue.

<div class="placeholder"><strong>Pièces à joindre :</strong> captures administrateur, code source précis et exemple d'appel API.</div>

<a id="a2-func-05"></a>
## A2-FUNC-05: Fonctionnalités transverses

**What the proof must show**  
La preuve doit montrer les fonctionnalités communes à plusieurs rôles : authentification, autorisation, support, notifications, observabilité, validation de formulaires ou gestion d'erreurs.

**Current repository references**
- [Frontend routes](../../product/FRONTEND_ROUTES.md)
- [API documentation](../../api/API_DOCUMENTATION.md)
- [Security](../../governance/SECURITY.md)
- `app/src/routes/guards/`
- `app/src/utils/authz.ts`
- `api/src/modules/auth/`
- `api/src/common/`
- `api/src/observability/`

**Screenshot placeholders**
- Connexion ou contrôle d'accès.
- Message d'erreur/validation.
- Écran support ou notification si utilisé comme preuve.

**Source code path placeholders**
- Chemin exact du guard frontend : à compléter.
- Chemin exact du guard/service backend : à compléter.
- Chemin exact du test associé : à compléter.

**API endpoint examples to document later**
- `GET /api/auth/me`
- Endpoint de support, notification ou monitoring : à compléter après preuve.

**Jury explanation placeholder**  
À compléter avec une explication montrant que les fonctionnalités transverses soutiennent l'ensemble des parcours et réduisent la duplication.

<div class="placeholder"><strong>Pièces à joindre :</strong> captures, code source et exemple API pour une fonctionnalité transverse vérifiable.</div>
