---
layout: default
title: "Annexe preuves - Bloc A2"
---

# Annexe preuves - Bloc A2

<nav class="proof-nav">
  <a href="{{ '/jury/bloc-a2/' | relative_url }}">Retour Bloc A2</a>
  <a href="{{ '/jury/bloc-a2/01-architecture.html' | relative_url }}">Architecture</a>
  <a href="{{ '/jury/bloc-a2/02-fonctionnalites.html' | relative_url }}">Fonctionnalités</a>
  <a href="{{ '/jury/bloc-a2/03-stack-technique.html' | relative_url }}">Stack</a>
  <a href="{{ '/jury/bloc-a2/04-qualite-code-tests.html' | relative_url }}">Qualité</a>
  <a href="{{ '/jury/bloc-a2/05-ci-cd-deploiement.html' | relative_url }}">CI/CD</a>
  <a href="{{ '/index.html' | relative_url }}">Accueil documentation</a>
</nav>

Cette annexe centralise la lecture des IDs de preuves, la matrice complète et les pièces à intégrer lors de la prochaine passe.

## Comment lire les IDs de preuve

| Segment | Signification | Exemple |
| --- | --- | --- |
| `A2` | Bloc évalué : Concevoir et développer une application. | `A2-ARCH-01` |
| `ARCH` | Catégorie architecture. | `A2-ARCH-02` |
| `FUNC` | Catégorie fonctionnalités. | `A2-FUNC-01` |
| `STACK` | Catégorie stack technique. | `A2-STACK-03` |
| `QUAL` | Catégorie qualité, code et tests. | `A2-QUAL-04` |
| `CICD` | Catégorie intégration et livraison continues. | `A2-CICD-01` |
| `DEPLOY` | Catégorie déploiement et vérification runtime. | `A2-DEPLOY-01` |
| Numéro final | Ordre de la preuve dans sa catégorie. | `01`, `02`, `03` |

## Matrice complète

| ID preuve | Élément démontré | Page | Preuve à attacher | Statut |
| --- | --- | --- | --- | --- |
| A2-ARCH-01 | Structure monorepo | [Architecture](01-architecture.md#a2-arch-01) | Capture arborescence, extrait `package.json`, lien GitHub | <span class="status todo">À compléter</span> |
| A2-ARCH-02 | Schéma d'architecture logicielle | [Architecture](01-architecture.md#a2-arch-02) | Schéma, explication des flux, lien documentation | <span class="status todo">À compléter</span> |
| A2-ARCH-03 | Découpage par couche | [Architecture](01-architecture.md#a2-arch-03) | Capture dossiers, extraits workspace, explication | <span class="status todo">À compléter</span> |
| A2-ARCH-04 | Patterns appliqués | [Architecture](01-architecture.md#a2-arch-04) | Extraits de code, ADR, lien commit | <span class="status todo">À compléter</span> |
| A2-FUNC-01 | Parcours citoyen | [Fonctionnalités](02-fonctionnalites.md#a2-func-01) | Captures, code, endpoints API | <span class="status todo">À compléter</span> |
| A2-FUNC-02 | Parcours agent | [Fonctionnalités](02-fonctionnalites.md#a2-func-02) | Captures, code, endpoints API | <span class="status todo">À compléter</span> |
| A2-FUNC-03 | Parcours gestionnaire | [Fonctionnalités](02-fonctionnalites.md#a2-func-03) | Captures, code, endpoints API | <span class="status todo">À compléter</span> |
| A2-FUNC-04 | Parcours administrateur | [Fonctionnalités](02-fonctionnalites.md#a2-func-04) | Captures, code, endpoints API | <span class="status todo">À compléter</span> |
| A2-FUNC-05 | Fonctionnalités transverses | [Fonctionnalités](02-fonctionnalites.md#a2-func-05) | Captures, guards, auth, validation, support | <span class="status todo">À compléter</span> |
| A2-STACK-01 | Root workspaces | [Stack technique](03-stack-technique.md#a2-stack-01) | Extrait `package.json` racine | <span class="status todo">À compléter</span> |
| A2-STACK-02 | Frontend stack | [Stack technique](03-stack-technique.md#a2-stack-02) | Extrait `app/package.json`, config Vite | <span class="status todo">À compléter</span> |
| A2-STACK-03 | Backend stack | [Stack technique](03-stack-technique.md#a2-stack-03) | Extrait `api/package.json`, config TS/Nest | <span class="status todo">À compléter</span> |
| A2-STACK-04 | Mobile stack | [Stack technique](03-stack-technique.md#a2-stack-04) | Extrait `mobile/package.json`, config Expo | <span class="status todo">À compléter</span> |
| A2-STACK-05 | Database stack | [Stack technique](03-stack-technique.md#a2-stack-05) | Extrait `database/package.json`, schéma/migration | <span class="status todo">À compléter</span> |
| A2-STACK-06 | Infrastructure/tooling | [Stack technique](03-stack-technique.md#a2-stack-06) | Docker Compose, workflow, script qualité | <span class="status todo">À compléter</span> |
| A2-QUAL-01 | Lint | [Qualité](04-qualite-code-tests.md#a2-qual-01) | Sortie `npm run lint` | <span class="status todo">À compléter</span> |
| A2-QUAL-02 | Typecheck | [Qualité](04-qualite-code-tests.md#a2-qual-02) | Sortie `npm run typecheck` | <span class="status todo">À compléter</span> |
| A2-QUAL-03 | Tests unitaires / intégration | [Qualité](04-qualite-code-tests.md#a2-qual-03) | Sortie `npm run test` | <span class="status todo">À compléter</span> |
| A2-QUAL-04 | Coverage | [Qualité](04-qualite-code-tests.md#a2-qual-04) | Sortie `npm run test:coverage` ou rapport | <span class="status todo">À compléter</span> |
| A2-QUAL-05 | Analyse statique / scripts qualité | [Qualité](04-qualite-code-tests.md#a2-qual-05) | Sortie build, doc-sync, affected ou full validation | <span class="status todo">À compléter</span> |
| A2-QUAL-06 | Anomalies corrigées | [Qualité](04-qualite-code-tests.md#a2-qual-06) | Lien commit/PR, description et validation | <span class="status todo">À compléter</span> |
| A2-CICD-01 | CI workflow | [CI/CD](05-ci-cd-deploiement.md#a2-cicd-01) | Workflow + run CI | <span class="status documented">Documenté</span> |
| A2-CICD-02 | CD workflow | [CI/CD](05-ci-cd-deploiement.md#a2-cicd-02) | Workflow + run CD | <span class="status documented">Documenté</span> |
| A2-CICD-03 | GitHub Actions successful run | [CI/CD](05-ci-cd-deploiement.md#a2-cicd-03) | URL run réussi, capture, commit | <span class="status todo">À compléter</span> |
| A2-DEPLOY-01 | Application déployée | [CI/CD](05-ci-cd-deploiement.md#a2-deploy-01) | URL, capture, vérification runtime | <span class="status todo">À compléter</span> |
| A2-DEPLOY-02 | Docs Pages deployment | [CI/CD](05-ci-cd-deploiement.md#a2-deploy-02) | Workflow Docs Pages + run + capture | <span class="status documented">Documenté</span> |
| A2-DEPLOY-03 | Smoke test / health check | [CI/CD](05-ci-cd-deploiement.md#a2-deploy-03) | Commande, sortie, date, environnement | <span class="status todo">À compléter</span> |

## Emplacements pour futures pièces jointes

| Type de preuve | Emplacement cible | Format attendu |
| --- | --- | --- |
| Capture écran | Section de preuve correspondante | Image, lien ou chemin validé. |
| Sortie terminal | Pages qualité ou déploiement | Bloc de sortie daté, non réécrit. |
| URL GitHub Actions | Pages CI/CD ou annexe | Lien exact du run. |
| Lien GitHub fichier/commit | Toutes catégories | Lien vers fichier ou commit précis. |
| Exemple API | Pages fonctionnalités ou déploiement | Requête, réponse réelle si disponible, date. |
| Capture application déployée | Page CI/CD et fonctionnalités | Capture navigateur avec URL visible si possible. |

## À intégrer lors de la prochaine passe

- Captures d'écran des parcours citoyen, agent, gestionnaire et administrateur.
- Liens des runs GitHub Actions réussis.
- Résultats de coverage réels.
- Captures de l'application déployée.
- Exemples API réels.
- Références de commit SHA.

## Checklist des preuves manquantes

- [ ] screenshots
- [ ] GitHub Actions run links
- [ ] coverage results
- [ ] deployed app screenshots
- [ ] API examples
- [ ] commit SHA references
