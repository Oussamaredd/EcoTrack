---
layout: default
title: "Dossier de preuves - Bloc A2"
---

# Dossier de preuves - Bloc A2 : Concevoir et développer une application

<nav class="proof-nav">
  <a href="{{ '/index.html' | relative_url }}">Accueil documentation</a>
  <a href="{{ '/documentation-index.html' | relative_url }}">Documentation complète</a>
  <a href="{{ '/jury/bloc-a2/annexe-preuves.html' | relative_url }}">Annexe preuves</a>
</nav>

Ce dossier sert de point d'entrée jury pour rattacher les preuves du Bloc A2 aux éléments évalués : architecture, fonctionnalités, stack technique, qualité de code, tests, CI/CD et déploiement.

Les preuves réelles ne sont pas encore attachées dans cette passe. Les pages ci-dessous préparent les emplacements où intégrer ensuite les captures, sorties de commandes, liens GitHub Actions, références de code, URLs de déploiement et commits.

## Matrice des preuves

| ID preuve | Section évaluée | Élément démontré | Page de preuve | Statut |
| --- | --- | --- | --- | --- |
| A2-ARCH-01 | Architecture | Structure monorepo | [Architecture](01-architecture.md#a2-arch-01) | <span class="status todo">À compléter</span> |
| A2-ARCH-02 | Architecture | Schéma d'architecture logicielle | [Architecture](01-architecture.md#a2-arch-02) | <span class="status todo">À compléter</span> |
| A2-ARCH-03 | Architecture | Découpage frontend / mobile / backend / database / infrastructure | [Architecture](01-architecture.md#a2-arch-03) | <span class="status todo">À compléter</span> |
| A2-ARCH-04 | Architecture | Patterns appliqués | [Architecture](01-architecture.md#a2-arch-04) | <span class="status todo">À compléter</span> |
| A2-FUNC-01 | Fonctionnalités | Parcours citoyen | [Fonctionnalités](02-fonctionnalites.md#a2-func-01) | <span class="status todo">À compléter</span> |
| A2-FUNC-02 | Fonctionnalités | Parcours agent | [Fonctionnalités](02-fonctionnalites.md#a2-func-02) | <span class="status todo">À compléter</span> |
| A2-FUNC-03 | Fonctionnalités | Parcours gestionnaire | [Fonctionnalités](02-fonctionnalites.md#a2-func-03) | <span class="status todo">À compléter</span> |
| A2-FUNC-04 | Fonctionnalités | Parcours administrateur | [Fonctionnalités](02-fonctionnalites.md#a2-func-04) | <span class="status todo">À compléter</span> |
| A2-FUNC-05 | Fonctionnalités | Fonctionnalités transverses | [Fonctionnalités](02-fonctionnalites.md#a2-func-05) | <span class="status todo">À compléter</span> |
| A2-STACK-01 | Stack technique | Root workspaces | [Stack technique](03-stack-technique.md#a2-stack-01) | <span class="status todo">À compléter</span> |
| A2-STACK-02 | Stack technique | Frontend stack | [Stack technique](03-stack-technique.md#a2-stack-02) | <span class="status todo">À compléter</span> |
| A2-STACK-03 | Stack technique | Backend stack | [Stack technique](03-stack-technique.md#a2-stack-03) | <span class="status todo">À compléter</span> |
| A2-STACK-04 | Stack technique | Mobile stack | [Stack technique](03-stack-technique.md#a2-stack-04) | <span class="status todo">À compléter</span> |
| A2-STACK-05 | Stack technique | Database stack | [Stack technique](03-stack-technique.md#a2-stack-05) | <span class="status todo">À compléter</span> |
| A2-STACK-06 | Stack technique | Infrastructure/tooling | [Stack technique](03-stack-technique.md#a2-stack-06) | <span class="status todo">À compléter</span> |
| A2-QUAL-01 | Qualité code/tests | Lint | [Qualité, code et tests](04-qualite-code-tests.md#a2-qual-01) | <span class="status todo">À compléter</span> |
| A2-QUAL-02 | Qualité code/tests | Typecheck | [Qualité, code et tests](04-qualite-code-tests.md#a2-qual-02) | <span class="status todo">À compléter</span> |
| A2-QUAL-03 | Qualité code/tests | Tests unitaires / intégration | [Qualité, code et tests](04-qualite-code-tests.md#a2-qual-03) | <span class="status todo">À compléter</span> |
| A2-QUAL-04 | Qualité code/tests | Coverage | [Qualité, code et tests](04-qualite-code-tests.md#a2-qual-04) | <span class="status todo">À compléter</span> |
| A2-QUAL-05 | Qualité code/tests | Analyse statique / scripts qualité | [Qualité, code et tests](04-qualite-code-tests.md#a2-qual-05) | <span class="status todo">À compléter</span> |
| A2-QUAL-06 | Qualité code/tests | Anomalies corrigées | [Qualité, code et tests](04-qualite-code-tests.md#a2-qual-06) | <span class="status todo">À compléter</span> |
| A2-CICD-01 | CI/CD | CI workflow | [CI/CD et déploiement](05-ci-cd-deploiement.md#a2-cicd-01) | <span class="status documented">Documenté</span> |
| A2-CICD-02 | CI/CD | CD workflow | [CI/CD et déploiement](05-ci-cd-deploiement.md#a2-cicd-02) | <span class="status documented">Documenté</span> |
| A2-CICD-03 | CI/CD | GitHub Actions successful run | [CI/CD et déploiement](05-ci-cd-deploiement.md#a2-cicd-03) | <span class="status todo">À compléter</span> |
| A2-DEPLOY-01 | Déploiement | Application déployée | [CI/CD et déploiement](05-ci-cd-deploiement.md#a2-deploy-01) | <span class="status todo">À compléter</span> |
| A2-DEPLOY-02 | Déploiement | Docs Pages deployment | [CI/CD et déploiement](05-ci-cd-deploiement.md#a2-deploy-02) | <span class="status documented">Documenté</span> |
| A2-DEPLOY-03 | Déploiement | Smoke test / health check | [CI/CD et déploiement](05-ci-cd-deploiement.md#a2-deploy-03) | <span class="status todo">À compléter</span> |

## Pages de preuves

| Page | Contenu |
| --- | --- |
| [01 - Architecture](01-architecture.md) | Structure monorepo, schéma d'architecture, découpage et patterns. |
| [02 - Fonctionnalités](02-fonctionnalites.md) | Parcours citoyen, agent, gestionnaire, administrateur et fonctionnalités transverses. |
| [03 - Stack technique](03-stack-technique.md) | Workspaces, frontend, backend, mobile, base de données, infrastructure et tooling. |
| [04 - Qualité, code et tests](04-qualite-code-tests.md) | Commandes attendues, sorties terminal, captures, commits et interprétation. |
| [05 - CI/CD et déploiement](05-ci-cd-deploiement.md) | Workflows, runs GitHub Actions, déploiements et smoke tests. |
| [Annexe preuves](annexe-preuves.md) | Lecture des IDs, matrice complète et checklist de preuves manquantes. |

## Règle de mise à jour future

Lors de la prochaine passe, chaque preuve fournie devra être rattachée à son ID exact, puis le statut devra passer de `À compléter` à `Documenté` ou `Validé` uniquement si l'élément attaché permet réellement cette conclusion.
