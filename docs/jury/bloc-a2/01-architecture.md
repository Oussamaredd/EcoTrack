---
layout: default
title: "Bloc A2 - Architecture"
---

# Bloc A2 - Preuves d'architecture

<nav class="proof-nav">
  <a href="{{ '/jury/bloc-a2/' | relative_url }}">Retour Bloc A2</a>
  <a href="{{ '/jury/bloc-a2/annexe-preuves.html' | relative_url }}">Annexe preuves</a>
  <a href="{{ '/index.html' | relative_url }}">Accueil documentation</a>
</nav>

Cette page rattache les preuves `A2-ARCH-*` au dossier jury. Les captures sont conservees dans `docs/assets/proofs/bloc-a2/architecture/` et les liens source pointent vers les fichiers du depot lorsque la preuve porte sur du code.

<a id="a2-arch-01"></a>
## A2-ARCH-01: Structure monorepo

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

EcoTrack est organise comme un monorepo avec des workspaces separes pour les surfaces applicatives, l'API, la base de donnees et l'infrastructure.

| Pièce | Légende jury |
| --- | --- |
| [A2-ARCH-01-github-repo-root.png]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-01-github-repo-root.png' | relative_url }}) | Vue GitHub de la racine du depot EcoTrack, utile pour verifier l'organisation monorepo presentee au jury. |

**Liens source**
- [Racine du depot](https://github.com/Oussamaredd/EcoTrack/tree/main)
- [package.json racine](https://github.com/Oussamaredd/EcoTrack/blob/main/package.json)
- [AGENTS.md](https://github.com/Oussamaredd/EcoTrack/blob/main/AGENTS.md)

**Lecture jury**  
Cette preuve montre que les couches du projet sont separees dans un depot unique, ce qui facilite les validations par workspace et la maintenance.

<a id="a2-arch-02"></a>
## A2-ARCH-02: Arborescence locale et couches du projet

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

L'arborescence locale confirme le decoupage `app`, `mobile`, `api`, `database`, `infrastructure` et `docs`.

| Pièce | Légende jury |
| --- | --- |
| [A2-ARCH-02-local-tree.png]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-02-local-tree.png' | relative_url }}) | Capture synthetique de l'arborescence locale du projet. |
| [A2-ARCH-02-local-tree.txt]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-02-local-tree.txt' | relative_url }}) | Sortie texte de l'arborescence, conservée comme preuve lisible et réutilisable. |

**Liens source**
- [app/](https://github.com/Oussamaredd/EcoTrack/tree/main/app)
- [mobile/](https://github.com/Oussamaredd/EcoTrack/tree/main/mobile)
- [api/](https://github.com/Oussamaredd/EcoTrack/tree/main/api)
- [database/](https://github.com/Oussamaredd/EcoTrack/tree/main/database)
- [infrastructure/](https://github.com/Oussamaredd/EcoTrack/tree/main/infrastructure)
- [docs/](https://github.com/Oussamaredd/EcoTrack/tree/main/docs)

**Lecture jury**  
La preuve permet de relier chaque dossier a une responsabilite technique precise : client web, client mobile, API, persistance, orchestration et documentation.

<a id="a2-arch-03"></a>
## A2-ARCH-03: Vue d'ensemble de l'architecture

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le projet maintient une documentation d'architecture qui decrit les couches applicatives et leurs interactions.

| Pièce | Légende jury |
| --- | --- |
| [A2-ARCH-03-architecture-overview.png]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-03-architecture-overview.png' | relative_url }}) | Capture de la documentation d'architecture, utilisée comme point d'entree pour comprendre les flux entre clients, API et donnees. |

**Liens source**
- [docs/architecture/ARCHITECTURE_OVERVIEW.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/architecture/ARCHITECTURE_OVERVIEW.md)
- [docs/api/API_DOCUMENTATION.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/api/API_DOCUMENTATION.md)
- [docs/data/DB_SCHEMA_NAMESPACE_PLAN.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/data/DB_SCHEMA_NAMESPACE_PLAN.md)

**Lecture jury**  
Cette preuve documente la structure logique d'EcoTrack et complete les captures d'arborescence par une lecture fonctionnelle des flux.

<a id="a2-arch-04"></a>
## A2-ARCH-04: Pattern controller, service, repository

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le backend suit le flux `controller -> service -> repository -> database`. Les captures montrent ce decoupage, et les liens GitHub renvoient aux fichiers source plutot qu'a des captures de code a recopier.

| Pièce | Légende jury |
| --- | --- |
| [A2-ARCH-04-api-controller.png]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-04-api-controller.png' | relative_url }}) | Capture d'un controleur API illustrant l'entree HTTP du module. |
| [A2-ARCH-04-api-service.png]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-04-api-service.png' | relative_url }}) | Capture d'un service applicatif qui orchestre la logique metier. |
| [A2-ARCH-04-api-repository.png]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-04-api-repository.png' | relative_url }}) | Capture d'un repository qui isole les acces aux donnees. |

**Liens source**
- [api/src/modules/reports/citizen-reports.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.controller.ts)
- [api/src/modules/reports/citizen-reports.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.service.ts)
- [api/src/modules/reports/citizen-reports.repository.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/reports/citizen-reports.repository.ts)
- [api/src/modules/tickets/tickets.controller.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/tickets/tickets.controller.ts)
- [api/src/modules/tickets/tickets.service.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/tickets/tickets.service.ts)
- [api/src/modules/tickets/tickets.repository.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/src/modules/tickets/tickets.repository.ts)

**Lecture jury**  
La preuve montre que l'API n'execute pas les requetes directement dans les controleurs : les responsabilites sont separees pour garder un code maintenable et testable.

<a id="a2-arch-05"></a>
## A2-ARCH-05: Structure frontend

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le frontend est organise autour de pages, routes, hooks, composants, services et etat applicatif.

| Pièce | Légende jury |
| --- | --- |
| [A2-ARCH-05-frontend-structure.png]({{ '/assets/proofs/bloc-a2/architecture/A2-ARCH-05-frontend-structure.png' | relative_url }}) | Capture de la structure frontend, utile pour verifier l'organisation de l'interface web et des points d'integration. |

**Liens source**
- [app/src/pages/](https://github.com/Oussamaredd/EcoTrack/tree/main/app/src/pages)
- [app/src/routes/AppRouter.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/routes/AppRouter.tsx)
- [app/src/hooks/](https://github.com/Oussamaredd/EcoTrack/tree/main/app/src/hooks)
- [app/src/services/](https://github.com/Oussamaredd/EcoTrack/tree/main/app/src/services)
- [app/src/state/](https://github.com/Oussamaredd/EcoTrack/tree/main/app/src/state)
- [docs/architecture/ADR-0002_FRONTEND_STATE_ARCHITECTURE.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/architecture/ADR-0002_FRONTEND_STATE_ARCHITECTURE.md)

**Lecture jury**  
Cette preuve complete le decoupage backend en montrant que l'interface web applique aussi une separation claire entre routes, pages, composants et logique d'acces aux donnees.
