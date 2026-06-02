---
layout: default
title: "Bloc A2 - Architecture"
---

# Bloc A2 - Preuves d'architecture

<nav class="proof-nav">
  <a href="index.md">Retour Bloc A2</a>
  <a href="annexe-preuves.md">Annexe preuves</a>
  <a href="../../index.md">Accueil documentation</a>
</nav>

Cette page prépare les preuves d'architecture à rattacher au dossier Bloc A2. Les références listées sont des emplacements candidats du dépôt ; elles ne remplacent pas les captures, sorties ou liens de preuve à fournir.

<a id="a2-arch-01"></a>
## A2-ARCH-01: Structure monorepo

**Claim**  
EcoTrack est organisé comme un monorepo séparant les surfaces applicatives, l'API, la base de données et l'infrastructure.

**Evidence expected**
- Capture de l'arborescence racine.
- Extrait du `package.json` racine montrant les workspaces.
- Lien GitHub vers le commit ou la vue du dépôt.

**Current repository references**
- `package.json`
- `app/`
- `mobile/`
- `api/`
- `database/`
- `infrastructure/`
- [Architecture overview](../../architecture/ARCHITECTURE_OVERVIEW.md)

**Files / links to attach later**
- Screenshot placeholder: capture de l'arborescence racine.
- Code reference placeholder: extrait `workspaces` du `package.json`.
- GitHub link placeholder: lien vers le commit ou dossier racine.

**Jury explanation**  
Cette preuve doit montrer que le projet n'est pas un ensemble de fichiers isolés, mais une structure organisée par responsabilité, ce qui facilite la maintenance, les validations ciblées et le déploiement par surface.

<div class="placeholder"><strong>Pièce à joindre :</strong> capture ou lien GitHub de la structure monorepo.</div>

<a id="a2-arch-02"></a>
## A2-ARCH-02: Schéma d'architecture logicielle

**Claim**  
EcoTrack documente une architecture logicielle composée de clients, API, persistance, infrastructure et observabilité.

**Evidence expected**
- Schéma d'architecture lisible pour le jury.
- Lien vers la page d'architecture existante.
- Explication courte des flux entre frontend, mobile, backend et base de données.

**Current repository references**
- [Architecture overview](../../architecture/ARCHITECTURE_OVERVIEW.md)
- [API documentation](../../api/API_DOCUMENTATION.md)
- [DB schema namespace plan](../../data/DB_SCHEMA_NAMESPACE_PLAN.md)
- [ELK observability](../../operations/observability/ELK.md)

**Files / links to attach later**
- Screenshot placeholder: rendu du schéma d'architecture.
- Code reference placeholder: fichiers illustrant les frontières entre couches.
- GitHub link placeholder: lien vers la documentation ou le commit du schéma.

**Jury explanation**  
Cette preuve doit permettre au jury de comprendre rapidement les composants principaux, leurs responsabilités et les échanges applicatifs sans devoir explorer tout le code.

<div class="placeholder"><strong>Pièce à joindre :</strong> image ou rendu du schéma d'architecture logicielle.</div>

<a id="a2-arch-03"></a>
## A2-ARCH-03: Découpage frontend / mobile / backend / database / infrastructure

**Claim**  
Le découpage du dépôt isole les responsabilités entre interface web, application mobile, API backend, couche de données et infrastructure.

**Evidence expected**
- Capture ou extrait montrant les dossiers `app/`, `mobile/`, `api/`, `database/` et `infrastructure/`.
- Référence aux scripts de build/test par workspace.
- Explication du rôle de chaque couche.

**Current repository references**
- `app/package.json`
- `mobile/package.json`
- `api/package.json`
- `database/package.json`
- `infrastructure/package.json`
- [Frontend routes](../../product/FRONTEND_ROUTES.md)
- [Environment setup](../../environment/setup/ENVIRONMENT_SETUP.md)

**Files / links to attach later**
- Screenshot placeholder: capture des dossiers par couche.
- Code reference placeholder: extraits des `package.json` workspace.
- GitHub link placeholder: liens vers chaque dossier applicatif.

**Jury explanation**  
Cette preuve doit montrer que chaque responsabilité technique a un emplacement clair, ce qui réduit le couplage et facilite l'évaluation du travail de développement.

<div class="placeholder"><strong>Pièce à joindre :</strong> vue annotée du découpage par couche.</div>

<a id="a2-arch-04"></a>
## A2-ARCH-04: Patterns appliqués

**Claim**  
Le projet applique des patterns explicites pour la séparation des responsabilités, la gestion d'état, la validation et les contrats d'API.

**Evidence expected**
- Extraits de code ou de documentation montrant les patterns utilisés.
- Lien vers l'ADR frontend state architecture.
- Références aux modules backend, DTO, services, guards ou hooks selon la preuve fournie.

**Current repository references**
- [ADR 0002 - Frontend state architecture](../../architecture/ADR-0002_FRONTEND_STATE_ARCHITECTURE.md)
- `api/src/modules/`
- `api/src/common/`
- `app/src/state/`
- `app/src/hooks/`
- `mobile/src/features/`

**Files / links to attach later**
- Screenshot placeholder: capture d'un exemple de structure ou diagramme pattern.
- Code reference placeholder: liens vers fichiers précis démontrant le pattern.
- GitHub link placeholder: lien vers le commit ou la PR associée.

**Jury explanation**  
Cette preuve doit expliquer comment les choix de structure et de patterns servent la lisibilité, la maintenabilité et la robustesse de l'application.

<div class="placeholder"><strong>Pièce à joindre :</strong> extrait commenté ou lien GitHub d'un pattern représentatif.</div>
