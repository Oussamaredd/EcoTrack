---
layout: default
title: "Bloc A2 - Stack technique"
---

# Bloc A2 - Preuves de stack technique

<nav class="proof-nav">
  <a href="{{ '/jury/bloc-a2/' | relative_url }}">Retour Bloc A2</a>
  <a href="{{ '/jury/bloc-a2/annexe-preuves.html' | relative_url }}">Annexe preuves</a>
  <a href="{{ '/index.html' | relative_url }}">Accueil documentation</a>
</nav>

Cette page prépare les preuves de stack technique. Les fichiers cités sont les sources attendues à capturer ou lier précisément lors de l'ajout des preuves.

<a id="a2-stack-01"></a>
## A2-STACK-01: Root workspaces

**Expected source file**
- `package.json`

**Technology / configuration to show**
- NPM workspaces déclarant `app`, `mobile`, `api`, `database` et `infrastructure`.
- Scripts racine de développement, build, lint, typecheck, test et coverage.

**Why this technology is used**  
Les workspaces permettent de piloter plusieurs surfaces applicatives depuis un dépôt unique tout en conservant des commandes dédiées par couche.

**Room for evidence**
- Screenshot placeholder: extrait du `package.json` racine.
- Code excerpt placeholder: bloc `workspaces` et scripts principaux.
- GitHub link placeholder: lien vers le fichier à un commit donné.

<div class="placeholder"><strong>Preuve attendue :</strong> extrait `package.json` racine avec workspaces et commandes.</div>

<a id="a2-stack-02"></a>
## A2-STACK-02: Frontend stack

**Expected source files**
- `app/package.json`
- `app/vite.config.js`
- `app/tsconfig.json`

**Technology / configuration to show**
- React, React DOM et Vite.
- React Router, TanStack Query, Supabase client, Socket.IO client.
- ESLint, TypeScript, Vitest et Testing Library.

**Why this technology is used**  
La stack frontend sert l'interface web manager/admin et les parcours web de démonstration avec une base TypeScript testable, routée et compatible avec des appels API asynchrones.

**Room for evidence**
- Screenshot placeholder: dépendances frontend dans `app/package.json`.
- Code excerpt placeholder: configuration Vite ou scripts `build`, `lint`, `typecheck`, `test`.
- GitHub link placeholder: lien vers le workspace `app`.

<div class="placeholder"><strong>Preuve attendue :</strong> extrait des dépendances et scripts frontend.</div>

<a id="a2-stack-03"></a>
## A2-STACK-03: Backend stack

**Expected source files**
- `api/package.json`
- `api/tsconfig.json`
- `api/tsconfig.build.json`

**Technology / configuration to show**
- NestJS, Express, TypeScript et RxJS.
- Drizzle ORM, validation DTO, JWT/OAuth, WebSocket et observabilité.
- Vitest, Supertest, ESLint et TypeScript pour les validations.

**Why this technology is used**  
La stack backend fournit une API structurée par modules, avec validation, authentification, orchestration métier et tests automatisables.

**Room for evidence**
- Screenshot placeholder: dépendances backend dans `api/package.json`.
- Code excerpt placeholder: scripts `build`, `lint`, `typecheck`, `test`, `test:coverage`.
- GitHub link placeholder: lien vers le workspace `api`.

<div class="placeholder"><strong>Preuve attendue :</strong> extrait des dépendances et scripts backend.</div>

<a id="a2-stack-04"></a>
## A2-STACK-04: Mobile stack

**Expected source files**
- `mobile/package.json`
- `mobile/tsconfig.json`

**Technology / configuration to show**
- Expo, React Native, Expo Router et React Navigation.
- Supabase client, TanStack Query, Sentry React Native, React Native Maps.
- ESLint, TypeScript, Vitest et Testing Library.

**Why this technology is used**  
La stack mobile sert les usages terrain et mobile-first, notamment les parcours citoyen et agent.

**Room for evidence**
- Screenshot placeholder: dépendances mobile dans `mobile/package.json`.
- Code excerpt placeholder: scripts `start`, `android`, `ios`, `lint`, `typecheck`, `test`.
- GitHub link placeholder: lien vers le workspace `mobile`.

<div class="placeholder"><strong>Preuve attendue :</strong> extrait des dépendances et scripts mobile.</div>

<a id="a2-stack-05"></a>
## A2-STACK-05: Database stack

**Expected source files**
- `database/package.json`
- `database/tsconfig.json`
- `database/schema/`
- `database/migrations/`

**Technology / configuration to show**
- Drizzle ORM et Drizzle Kit.
- PostgreSQL via dépendance `postgres`.
- Supabase client lorsque pertinent.
- Scripts de génération, migration, seed et export/import de données.

**Why this technology is used**  
La couche database centralise le schéma, les migrations et les opérations de seed pour rendre la persistance contrôlable et vérifiable.

**Room for evidence**
- Screenshot placeholder: scripts DB dans `database/package.json`.
- Code excerpt placeholder: migration ou schéma représentatif.
- GitHub link placeholder: lien vers le workspace `database`.

<div class="placeholder"><strong>Preuve attendue :</strong> extrait des scripts DB et référence de schéma/migration.</div>

<a id="a2-stack-06"></a>
## A2-STACK-06: Infrastructure/tooling

**Expected source files**
- `infrastructure/package.json`
- `infrastructure/docker-compose.yml`
- `infrastructure/environments/`
- `.github/workflows/CI.yaml`
- `.github/workflows/CD.yml`
- `.github/workflows/docs-pages.yml`

**Technology / configuration to show**
- Docker Compose pour l'environnement local.
- Scripts de smoke test, health check et tooling CI.
- GitHub Actions pour CI, CD, monitoring synthétique et déploiement Pages.

**Why this technology is used**  
L'infrastructure et le tooling rendent les environnements reproductibles, automatisent les validations et structurent les déploiements.

**Room for evidence**
- Screenshot placeholder: extrait `docker-compose.yml` ou workflow GitHub Actions.
- Code excerpt placeholder: script ou job CI/CD représentatif.
- GitHub link placeholder: lien vers le workflow ou fichier d'infrastructure.

<div class="placeholder"><strong>Preuve attendue :</strong> extrait d'un workflow et/ou de la configuration Docker Compose.</div>
