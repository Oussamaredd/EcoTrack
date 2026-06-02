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

Cette page rattache les preuves `A2-STACK-*` aux fichiers de configuration qui définissent la stack EcoTrack. Les captures documentent les dépendances et les scripts ; les liens GitHub permettent au jury de consulter les sources à jour.

<a id="a2-stack-01"></a>
## A2-STACK-01: Root workspaces

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le `package.json` racine pilote les workspaces et les commandes transverses du monorepo.

| Pièce | Légende jury |
| --- | --- |
| [A2-STACK-01-root-workspaces.png]({{ '/assets/proofs/bloc-a2/stack/A2-STACK-01-root-workspaces.png' | relative_url }}) | Capture du `package.json` racine montrant les workspaces et scripts principaux. |

**Liens source**
- [package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/package.json)
- [package-lock.json](https://github.com/Oussamaredd/EcoTrack/blob/main/package-lock.json)

**Lecture jury**  
Cette preuve montre que les commandes racine coordonnent les validations des workspaces sans mélanger les responsabilités de chaque couche.

<a id="a2-stack-02"></a>
## A2-STACK-02: Frontend stack

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le workspace frontend s'appuie sur React, Vite, TypeScript, Vitest et les bibliothèques d'interface nécessaires au portail web.

| Pièce | Légende jury |
| --- | --- |
| [A2-STACK-02-frontend-package.png]({{ '/assets/proofs/bloc-a2/stack/A2-STACK-02-frontend-package.png' | relative_url }}) | Capture du `app/package.json`, centrée sur les scripts et dépendances frontend. |

**Liens source**
- [app/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/app/package.json)
- [app/vite.config.js](https://github.com/Oussamaredd/EcoTrack/blob/main/app/vite.config.js)
- [app/tsconfig.json](https://github.com/Oussamaredd/EcoTrack/blob/main/app/tsconfig.json)

**Lecture jury**  
La stack frontend fournit une application web routée, typée et testable pour les parcours citoyen, agent, gestionnaire et administrateur.

<a id="a2-stack-03"></a>
## A2-STACK-03: Backend stack

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le workspace API utilise NestJS, TypeScript, Drizzle, validation DTO, observabilité et tests automatisés.

| Pièce | Légende jury |
| --- | --- |
| [A2-STACK-03-api-package.png]({{ '/assets/proofs/bloc-a2/stack/A2-STACK-03-api-package.png' | relative_url }}) | Capture du `api/package.json`, centrée sur les dépendances et scripts backend. |

**Liens source**
- [api/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/api/package.json)
- [api/tsconfig.json](https://github.com/Oussamaredd/EcoTrack/blob/main/api/tsconfig.json)
- [api/tsconfig.build.json](https://github.com/Oussamaredd/EcoTrack/blob/main/api/tsconfig.build.json)
- [api/src/modules/](https://github.com/Oussamaredd/EcoTrack/tree/main/api/src/modules)

**Lecture jury**  
Cette preuve relie la stack backend aux modules applicatifs et aux validations techniques attendues dans une API structurée.

<a id="a2-stack-04"></a>
## A2-STACK-04: Mobile stack

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le workspace mobile s'appuie sur Expo, React Native, TypeScript et des fonctionnalités orientées terrain.

| Pièce | Légende jury |
| --- | --- |
| [A2-STACK-04-mobile-package.png]({{ '/assets/proofs/bloc-a2/stack/A2-STACK-04-mobile-package.png' | relative_url }}) | Capture du `mobile/package.json`, centrée sur la stack Expo/React Native et les scripts de validation. |

**Liens source**
- [mobile/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/package.json)
- [mobile/tsconfig.json](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/tsconfig.json)
- [mobile/src/features/](https://github.com/Oussamaredd/EcoTrack/tree/main/mobile/src/features)

**Lecture jury**  
Cette preuve montre que les usages mobiles sont isolés dans un workspace dédié tout en restant intégrés au monorepo.

<a id="a2-stack-05"></a>
## A2-STACK-05: Database stack

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le workspace database centralise Drizzle, les migrations, le schéma et les opérations de seed.

| Pièce | Légende jury |
| --- | --- |
| [A2-STACK-05-database-package.png]({{ '/assets/proofs/bloc-a2/stack/A2-STACK-05-database-package.png' | relative_url }}) | Capture du `database/package.json`, centrée sur les scripts schema, migration et seed. |

**Liens source**
- [database/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/database/package.json)
- [database/schema/](https://github.com/Oussamaredd/EcoTrack/tree/main/database/schema)
- [database/migrations/](https://github.com/Oussamaredd/EcoTrack/tree/main/database/migrations)
- [docs/data/DB_SCHEMA_NAMESPACE_STATUS.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/data/DB_SCHEMA_NAMESPACE_STATUS.md)

**Lecture jury**  
Cette preuve montre que la persistance n'est pas dispersée dans l'API : elle est gouvernée par un workspace de base de données.

<a id="a2-stack-06"></a>
## A2-STACK-06: Infrastructure et tooling

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Aucun fichier `A2-STACK-06-*` n'était présent dans le pack. La preuve est donc documentée par les fichiers source d'infrastructure et les workflows GitHub Actions existants.

| Pièce | Légende jury |
| --- | --- |
| Source code | Configuration Docker, scripts CI et workflows consultables directement dans le dépôt. |

**Liens source**
- [infrastructure/docker-compose.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/docker-compose.yml)
- [infrastructure/Dockerfile](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/Dockerfile)
- [app/Dockerfile](https://github.com/Oussamaredd/EcoTrack/blob/main/app/Dockerfile)
- [.github/workflows/CI.yaml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/CI.yaml)
- [.github/workflows/CD.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/CD.yml)
- [.github/workflows/docs-pages.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/docs-pages.yml)
- [infrastructure/scripts/](https://github.com/Oussamaredd/EcoTrack/tree/main/infrastructure/scripts)

**Lecture jury**  
Cette preuve couvre l'outillage par lien source plutôt que par capture : le jury peut ouvrir les workflows et scripts exacts qui pilotent les environnements, contrôles et déploiements.
