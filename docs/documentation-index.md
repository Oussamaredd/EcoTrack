---
layout: default
title: Documentation complète
---

# Documentation complète

[Retour à l'accueil](index.md)

Cette page liste les fichiers documentaires du dossier `docs/` et les regroupe par catégorie pour faciliter la revue technique, produit et jury.

## Jury / Rapports finaux

| Document | Description |
| --- | --- |
| [Accueil jury](jury/index.md) | Point d'entrée des supports jury versionnés dans la documentation. |
| [Rapports finaux A1-A4](jury/final-reports/index.md) | Page de téléchargement des quatre rapports Word finalisés. |
| [Rapport Bloc A1 - Planification et organisation](jury/final-reports/EcoTrack_Rapport_Bloc_A1_Planification_Organisation.docx) | Rapport final sur le cadrage, la méthode, la planification, les risques et le bilan projet. |
| [Rapport Bloc A2 - Développement](jury/final-reports/EcoTrack_Rapport_Bloc_A2_Dev.docx) | Rapport final sur la conception, le développement, la stack et les preuves techniques. |
| [Rapport Bloc A3 - Qualité et maintenabilité](jury/final-reports/EcoTrack_Rapport_Bloc_A3_Dev.docx) | Rapport final sur les contrôles qualité, la sécurité applicative, la performance et la maintenabilité. |
| [Rapport Bloc A4 - Pilotage d'équipe](jury/final-reports/EcoTrack_Rapport_Bloc_A4_Pilotage_Equipe.docx) | Rapport final sur le pilotage, les rôles, Jira, les rituels et le bilan collectif. |

## Architecture

| Document | Description |
| --- | --- |
| [Architecture overview](architecture/ARCHITECTURE_OVERVIEW.md) | Vue d'ensemble des couches, flux et contrats d'architecture. |
| [ADR 0002 - Frontend state architecture](architecture/ADR-0002_FRONTEND_STATE_ARCHITECTURE.md) | Décision d'architecture sur la gestion d'état frontend. |

## API

| Document | Description |
| --- | --- |
| [API documentation](api/API_DOCUMENTATION.md) | Contrat REST, endpoints et comportements par domaine métier. |
| [OpenAPI README](api/openapi/README.md) | Point d'entrée des spécifications OpenAPI. |
| [Domain modules OpenAPI](api/openapi/ecotrack-domain-modules.yaml) | Spécification OpenAPI des modules domaine. |
| [Sprint 0 OpenAPI](api/openapi/ecotrack-sprint0.yaml) | Spécification OpenAPI de référence Sprint 0. |

## Environment

| Document | Description |
| --- | --- |
| [ENV](environment/reference/ENV.md) | Référence des variables d'environnement et contrats d'origine. |
| [ENV canonical decisions](environment/reference/ENV_CANONICAL_DECISIONS.md) | Décisions canoniques liées à l'environnement. |
| [ENV conflicts](environment/reference/ENV_CONFLICTS.md) | Historique des conflits et normalisations d'environnement. |
| [ENV inventory](environment/reference/ENV_INVENTORY.md) | Inventaire des variables d'environnement. |
| [Docker setup](environment/setup/DOCKER_SETUP.md) | Procédure Docker et états attendus des services. |
| [Environment setup](environment/setup/ENVIRONMENT_SETUP.md) | Installation locale, Docker et déploiement. |

## Governance

| Document | Description |
| --- | --- |
| [Code annotation conventions](governance/CODE_ANNOTATION_CONVENTIONS.md) | Conventions JSDoc/TSDoc et documentation du code exporté. |
| [Quality scorecard](governance/QUALITY_SCORECARD.md) | Contrat de qualité et seuils de validation documentés. |
| [Release versioning](governance/RELEASE_VERSIONING.md) | Processus de versionnement et publication. |
| [Security](governance/SECURITY.md) | Gestion des secrets et garde-fous de sécurité. |
| [Definition of done checklist](governance/checklists/DOD_CHECKLIST.md) | Checklist de définition de terminé. |

## Product / Features

| Document | Description |
| --- | --- |
| [Frontend routes](product/FRONTEND_ROUTES.md) | Carte des routes web et politiques d'accès par rôle. |
| [Advanced ticket list](product/features/AdvancedTicketList.md) | Notes fonctionnelles sur la liste avancée de tickets. |
| [Dashboard](product/features/Dashboard.md) | Fonctionnement du dashboard manager/admin. |
| [Design system](product/features/DesignSystem.md) | Contrats UI et composants réutilisables. |
| [Internal domain events](product/features/InternalDomainEvents.md) | Notes sur les événements internes et projections. |
| [IoT ingestion](product/features/IotIngestion.md) | Ingestion IoT, replay et intégration opérationnelle. |
| [Ticket details](product/features/TicketDetails.md) | Notes fonctionnelles sur le détail des tickets. |
| [Agent quick guide](product/guides/AGENT_QUICK_GUIDE.md) | Guide rapide du parcours agent. |
| [Citizen quick guide](product/guides/CITIZEN_QUICK_GUIDE.md) | Guide rapide du parcours citoyen. |
| [Manager quick guide](product/guides/MANAGER_QUICK_GUIDE.md) | Guide rapide du parcours gestionnaire. |

## Specs

| Document | Description |
| --- | --- |
| [Specs README](specs/README.md) | Point d'entrée des spécifications et sources de vérité. |
| [Source of truth](specs/SOURCE_OF_TRUTH.md) | Gouvernance des spécifications exécutables. |
| [CDC traceability matrix JSON](specs/cdc-traceability-matrix.dev.json) | Matrice CDC machine-readable. |
| [CDC traceability matrix](specs/cdc-traceability-matrix.dev.md) | Matrice CDC lisible pour la revue. |
| [Chatbot integration contract](specs/chatbot-integration-contract.md) | Contrat d'intégration chatbot. |
| [Citizen first report onboarding](specs/citizen-first-report-onboarding.md) | Spécification d'onboarding citoyen orienté signalement. |
| [K8s realtime metrics preflight](specs/k8s-realtime-metrics-preflight.md) | Préflight métriques temps réel Kubernetes. |
| [Mobile layer rollout plan](specs/mobile-layer-rollout-plan.md) | Plan de déploiement de la couche mobile. |
| [Mobile platform integration contract](specs/mobile-platform-integration-contract.md) | Contrat d'intégration plateforme/mobile. |
| [Realtime dashboard push contract](specs/realtime-dashboard-push-contract.md) | Contrat de push temps réel du dashboard. |
| [Source of truth JSON](specs/source-of-truth.dev.json) | Source de vérité machine-readable. |
| [Sprint 0 domain model](specs/sprint0-domain-model.md) | Modèle domaine Sprint 0. |
| [WebSocket realtime step plan](specs/websocket-realtime-step-plan.md) | Plan d'intégration WebSocket temps réel. |
| [Workbook monolith open tasks](specs/workbook-monolith-open-tasks.md) | Tâches ouvertes issues du workbook monolithique. |

## Operations / Runbooks

| Document | Description |
| --- | --- |
| [ELK observability](operations/observability/ELK.md) | Notes d'observabilité Elasticsearch/Logstash/Kibana. |
| [Accessibility responsive audit](operations/runbooks/ACCESSIBILITY_RESPONSIVE_AUDIT.md) | Runbook d'audit accessibilité et responsive. |
| [CORS origin management](operations/runbooks/CORS_ORIGIN_MANAGEMENT.md) | Gestion des origines CORS. |
| [Demo readiness](operations/runbooks/DEMO_READINESS.md) | Préparation de démonstration. |
| [Deployment platform rollout plan](operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md) | Plan de déploiement Cloudflare Pages, Render et Supabase. |
| [Extended quality gates](operations/runbooks/EXTENDED_QUALITY_GATES.md) | Gates qualité étendus. |
| [IoT event replay and alerting](operations/runbooks/IOT_EVENT_REPLAY_AND_ALERTING.md) | Replay d'événements IoT et alerting. |
| [Mobile product readiness](operations/runbooks/MOBILE_PRODUCT_READINESS.md) | Readiness produit mobile. |
| [OAuth callback remediation](operations/runbooks/OAUTH_CALLBACK_REMEDIATION.md) | Remédiation OAuth callback. |
| [Observability and reliability](operations/runbooks/OBSERVABILITY_AND_RELIABILITY.md) | Fiabilité et observabilité. |
| [Performance backlog operations](operations/runbooks/PERFORMANCE_BACKLOG_OPERATIONS.md) | Backlog performance et procédures associées. |
| [Supabase managed Postgres baseline](operations/runbooks/SUPABASE_MANAGED_POSTGRES_BASELINE.md) | Baseline Supabase Managed Postgres. |

## Planning

| Document | Description |
| --- | --- |
| [Landing plan](planning/plans/landing-plan.md) | Plan d'exécution de la landing page. |
| [Platform micro roadmap](planning/roadmaps/PLATFORM_MICRO_ROADMAP.md) | Roadmap plateforme et DevOps. |
| [Roadmap](planning/roadmaps/ROADMAP.md) | Roadmap principale et suivi sprint. |
| [Product hardening tasks](planning/tasks/PRODUCT_HARDENING_10_10_TASKS.md) | Tâches de durcissement produit et qualité. |
| [PR tasks](planning/tasks/PR_TASKS.md) | Suivi de tâches de rollout et déploiement. |

## Data

| Document | Description |
| --- | --- |
| [DB schema namespace plan](data/DB_SCHEMA_NAMESPACE_PLAN.md) | Plan de migration et organisation des namespaces DB. |
| [DB schema namespace status](data/DB_SCHEMA_NAMESPACE_STATUS.md) | État de mise en oeuvre des namespaces DB. |
| [Seed data policy](data/SEED_DATA_POLICY.md) | Politique de données de seed. |

## Jury / Bloc A2

| Document | Description |
| --- | --- |
| [Dossier de preuves Bloc A2](jury/bloc-a2/index.md) | Portail jury et matrice de preuves. |
| [Architecture](jury/bloc-a2/01-architecture.md) | Preuves de structure, architecture et découpage. |
| [Fonctionnalités](jury/bloc-a2/02-fonctionnalites.md) | Preuves des parcours citoyen, agent, gestionnaire et administrateur. |
| [Stack technique](jury/bloc-a2/03-stack-technique.md) | Preuves de stack frontend, backend, mobile, DB et tooling. |
| [Qualité, code et tests](jury/bloc-a2/04-qualite-code-tests.md) | Preuves de lint, typecheck, tests, coverage et qualité. |
| [CI/CD et déploiement](jury/bloc-a2/05-ci-cd-deploiement.md) | Preuves de workflows, runs GitHub Actions et déploiements. |
| [Annexe preuves](jury/bloc-a2/annexe-preuves.md) | Annexe, matrice complète et pièces à intégrer. |

## Other

| Document | Description |
| --- | --- |
| [Project documentation](README.md) | Index documentaire historique du dossier `docs/`. |
| [EcoTrack project analysis](analysis/ECOTRACK_PROJECT_ANALYSIS.md) | Analyse projet, méthodologie, risques et livrables. |
| [Phase 0 baseline - 2026-02-10](baselines/phase0/2026-02-10/README.md) | Baseline de validation phase 0. |
