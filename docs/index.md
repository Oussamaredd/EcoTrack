---
layout: default
title: EcoTrack Documentation
---

# EcoTrack Documentation

EcoTrack est un projet de gestion et de coordination de signalements, tournées et opérations liées aux déchets urbains. Ce portail regroupe la documentation technique, les guides produit, les runbooks et le dossier de preuves Bloc A2 destiné au jury.

<div class="portal-actions">
  <a class="primary" href="{{ '/documentation-index.html' | relative_url }}">Parcourir la documentation complète</a>
  <a class="secondary" href="{{ '/jury/bloc-a2/' | relative_url }}">Consulter le dossier de preuves - Bloc A2</a>
  <a class="secondary" href="https://github.com/Oussamaredd/EcoTrack">Voir le repository GitHub</a>
  <a class="secondary" href="https://ecotrack-jmj.pages.dev">Voir l'application déployée</a>
</div>

<p class="doc-note">L'URL applicative ci-dessus est référencée dans les notes de déploiement existantes. Les preuves de validation associées restent à rattacher dans le dossier Bloc A2.</p>

## Sections principales

| Section | Objectif | Entrée |
| --- | --- | --- |
| Documentation complète | Index maintenable de tous les fichiers documentaires. | [Documentation index](documentation-index.md) |
| Dossier de preuves Bloc A2 | Matrice de preuves et pages d'évidence pour le jury. | [Dossier Bloc A2](jury/bloc-a2/index.md) |
| Architecture | Architecture logicielle, découpage monorepo et décisions techniques. | [Architecture overview](architecture/ARCHITECTURE_OVERVIEW.md) |
| API | Contrats REST, OpenAPI et comportements par domaine. | [API documentation](api/API_DOCUMENTATION.md) |
| Produit | Routes web, guides rôle et notes fonctionnelles. | [Frontend routes](product/FRONTEND_ROUTES.md) |
| Environnement | Configuration locale, Docker, variables et décisions d'environnement. | [Environment setup](environment/setup/ENVIRONMENT_SETUP.md) |
| Gouvernance | Sécurité, qualité, conventions et définition de terminé. | [Quality scorecard](governance/QUALITY_SCORECARD.md) |
| Opérations | Runbooks de déploiement, observabilité, audits et support production. | [Deployment rollout plan](operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md) |
| Planning | Roadmaps, plans et tâches de durcissement. | [Roadmap](planning/roadmaps/ROADMAP.md) |
| Spécifications | Source de vérité, matrices CDC et contrats d'intégration. | [Specs README](specs/README.md) |

## Documentation référencée

| Catégorie | Fichiers |
| --- | --- |
| Portail | [Project documentation](README.md), [Documentation index](documentation-index.md) |
| Bloc A2 | [Dossier de preuves](jury/bloc-a2/index.md), [Architecture](jury/bloc-a2/01-architecture.md), [Fonctionnalités](jury/bloc-a2/02-fonctionnalites.md), [Stack technique](jury/bloc-a2/03-stack-technique.md), [Qualité, code et tests](jury/bloc-a2/04-qualite-code-tests.md), [CI/CD et déploiement](jury/bloc-a2/05-ci-cd-deploiement.md), [Annexe preuves](jury/bloc-a2/annexe-preuves.md) |
| Analyse | [EcoTrack project analysis](analysis/ECOTRACK_PROJECT_ANALYSIS.md) |
| API | [API documentation](api/API_DOCUMENTATION.md), [OpenAPI README](api/openapi/README.md), [Domain modules OpenAPI](api/openapi/ecotrack-domain-modules.yaml), [Sprint 0 OpenAPI](api/openapi/ecotrack-sprint0.yaml) |
| Architecture | [Architecture overview](architecture/ARCHITECTURE_OVERVIEW.md), [ADR 0002 - Frontend state architecture](architecture/ADR-0002_FRONTEND_STATE_ARCHITECTURE.md) |
| Baselines | [Phase 0 baseline - 2026-02-10](baselines/phase0/2026-02-10/README.md) |
| Données | [DB schema namespace plan](data/DB_SCHEMA_NAMESPACE_PLAN.md), [DB schema namespace status](data/DB_SCHEMA_NAMESPACE_STATUS.md), [Seed data policy](data/SEED_DATA_POLICY.md) |
| Environnement | [ENV](environment/reference/ENV.md), [ENV canonical decisions](environment/reference/ENV_CANONICAL_DECISIONS.md), [ENV conflicts](environment/reference/ENV_CONFLICTS.md), [ENV inventory](environment/reference/ENV_INVENTORY.md), [Docker setup](environment/setup/DOCKER_SETUP.md), [Environment setup](environment/setup/ENVIRONMENT_SETUP.md) |
| Gouvernance | [Code annotation conventions](governance/CODE_ANNOTATION_CONVENTIONS.md), [Quality scorecard](governance/QUALITY_SCORECARD.md), [Release versioning](governance/RELEASE_VERSIONING.md), [Security](governance/SECURITY.md), [Definition of done checklist](governance/checklists/DOD_CHECKLIST.md) |
| Opérations | [ELK observability](operations/observability/ELK.md), [Accessibility responsive audit](operations/runbooks/ACCESSIBILITY_RESPONSIVE_AUDIT.md), [CORS origin management](operations/runbooks/CORS_ORIGIN_MANAGEMENT.md), [Demo readiness](operations/runbooks/DEMO_READINESS.md), [Deployment platform rollout plan](operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md), [Extended quality gates](operations/runbooks/EXTENDED_QUALITY_GATES.md), [IoT event replay and alerting](operations/runbooks/IOT_EVENT_REPLAY_AND_ALERTING.md), [Mobile product readiness](operations/runbooks/MOBILE_PRODUCT_READINESS.md), [OAuth callback remediation](operations/runbooks/OAUTH_CALLBACK_REMEDIATION.md), [Observability and reliability](operations/runbooks/OBSERVABILITY_AND_RELIABILITY.md), [Performance backlog operations](operations/runbooks/PERFORMANCE_BACKLOG_OPERATIONS.md), [Supabase managed Postgres baseline](operations/runbooks/SUPABASE_MANAGED_POSTGRES_BASELINE.md) |
| Planning | [Landing plan](planning/plans/landing-plan.md), [Platform micro roadmap](planning/roadmaps/PLATFORM_MICRO_ROADMAP.md), [Roadmap](planning/roadmaps/ROADMAP.md), [Product hardening tasks](planning/tasks/PRODUCT_HARDENING_10_10_TASKS.md), [PR tasks](planning/tasks/PR_TASKS.md) |
| Produit | [Frontend routes](product/FRONTEND_ROUTES.md), [Advanced ticket list](product/features/AdvancedTicketList.md), [Dashboard](product/features/Dashboard.md), [Design system](product/features/DesignSystem.md), [Internal domain events](product/features/InternalDomainEvents.md), [IoT ingestion](product/features/IotIngestion.md), [Ticket details](product/features/TicketDetails.md), [Agent quick guide](product/guides/AGENT_QUICK_GUIDE.md), [Citizen quick guide](product/guides/CITIZEN_QUICK_GUIDE.md), [Manager quick guide](product/guides/MANAGER_QUICK_GUIDE.md) |
| Spécifications | [Specs README](specs/README.md), [Source of truth](specs/SOURCE_OF_TRUTH.md), [CDC traceability matrix JSON](specs/cdc-traceability-matrix.dev.json), [CDC traceability matrix](specs/cdc-traceability-matrix.dev.md), [Chatbot integration contract](specs/chatbot-integration-contract.md), [Citizen first report onboarding](specs/citizen-first-report-onboarding.md), [K8s realtime metrics preflight](specs/k8s-realtime-metrics-preflight.md), [Mobile layer rollout plan](specs/mobile-layer-rollout-plan.md), [Mobile platform integration contract](specs/mobile-platform-integration-contract.md), [Realtime dashboard push contract](specs/realtime-dashboard-push-contract.md), [Source of truth JSON](specs/source-of-truth.dev.json), [Sprint 0 domain model](specs/sprint0-domain-model.md), [WebSocket realtime step plan](specs/websocket-realtime-step-plan.md), [Workbook monolith open tasks](specs/workbook-monolith-open-tasks.md) |

## Note de versionnement

Cette documentation est versionnée avec le code source EcoTrack. Chaque modification de contenu documentaire peut donc être relue, historisée et rattachée à un commit Git.
