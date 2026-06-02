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

Les pièces fournies dans le proof pack ont été copiées dans `docs/assets/proofs/bloc-a2/` avec les catégories demandées : `architecture`, `fonctionnalites`, `stack`, `qualite-tests` et `ci-cd-deploiement`.

## Synthèse d'avancement

| Statut | Lecture jury |
| --- | --- |
| <span class="status validated">Validé</span> | La pièce fournie montre un résultat explicite : succès, HTTP 200, sortie de commande terminée ou run réussi. |
| <span class="status documented">Documenté</span> | La pièce ou le lien source documente l'élément, sans suffire à conclure à une validation runtime complète. |
| <span class="status todo">À compléter</span> | La pièce attendue n'est pas présente dans le proof pack ou doit être fournie séparément. |

## Matrice des preuves

| ID preuve | Section évaluée | Élément démontré | Page de preuve | Statut |
| --- | --- | --- | --- | --- |
| A2-ARCH-01 | Architecture | Structure monorepo | [Architecture](01-architecture.html#a2-arch-01) | <span class="status documented">Documenté</span> |
| A2-ARCH-02 | Architecture | Arborescence locale et couches | [Architecture](01-architecture.html#a2-arch-02) | <span class="status documented">Documenté</span> |
| A2-ARCH-03 | Architecture | Vue d'ensemble architecture | [Architecture](01-architecture.html#a2-arch-03) | <span class="status documented">Documenté</span> |
| A2-ARCH-04 | Architecture | Pattern controller/service/repository | [Architecture](01-architecture.html#a2-arch-04) | <span class="status documented">Documenté</span> |
| A2-ARCH-05 | Architecture | Structure frontend | [Architecture](01-architecture.html#a2-arch-05) | <span class="status documented">Documenté</span> |
| A2-FUNC-01 | Fonctionnalités | Signalement citoyen | [Fonctionnalités](02-fonctionnalites.html#a2-func-01) | <span class="status validated">Validé</span> |
| A2-FUNC-02 | Fonctionnalités | Suivi citoyen, profil, gamification | [Fonctionnalités](02-fonctionnalites.html#a2-func-02) | <span class="status documented">Documenté</span> |
| A2-FUNC-03 | Fonctionnalités | Parcours agent | [Fonctionnalités](02-fonctionnalites.html#a2-func-03) | <span class="status documented">Documenté</span> |
| A2-FUNC-04 | Fonctionnalités | Parcours gestionnaire | [Fonctionnalités](02-fonctionnalites.html#a2-func-04) | <span class="status documented">Documenté</span> |
| A2-FUNC-05 | Fonctionnalités | Parcours administrateur | [Fonctionnalités](02-fonctionnalites.html#a2-func-05) | <span class="status documented">Documenté</span> |
| A2-FUNC-06 | Fonctionnalités | Authentification et route protégée | [Fonctionnalités](02-fonctionnalites.html#a2-func-06) | <span class="status documented">Documenté</span> |
| A2-FUNC-API-01 | Fonctionnalités/API | Health readiness HTTP 200 | [Fonctionnalités](02-fonctionnalites.html#a2-func-api-01) | <span class="status validated">Validé</span> |
| A2-FUNC-API-02 | Fonctionnalités/API | Endpoint zones HTTP 200 | [Fonctionnalités](02-fonctionnalites.html#a2-func-api-02) | <span class="status validated">Validé</span> |
| A2-FUNC-API-03 | Fonctionnalités/API | Endpoint citizen reports HTTP 200 | [Fonctionnalités](02-fonctionnalites.html#a2-func-api-03) | <span class="status validated">Validé</span> |
| A2-STACK-01 | Stack technique | Root workspaces | [Stack technique](03-stack-technique.html#a2-stack-01) | <span class="status documented">Documenté</span> |
| A2-STACK-02 | Stack technique | Frontend stack | [Stack technique](03-stack-technique.html#a2-stack-02) | <span class="status documented">Documenté</span> |
| A2-STACK-03 | Stack technique | Backend stack | [Stack technique](03-stack-technique.html#a2-stack-03) | <span class="status documented">Documenté</span> |
| A2-STACK-04 | Stack technique | Mobile stack | [Stack technique](03-stack-technique.html#a2-stack-04) | <span class="status documented">Documenté</span> |
| A2-STACK-05 | Stack technique | Database stack | [Stack technique](03-stack-technique.html#a2-stack-05) | <span class="status documented">Documenté</span> |
| A2-STACK-06 | Stack technique | Infrastructure et tooling | [Stack technique](03-stack-technique.html#a2-stack-06) | <span class="status documented">Documenté</span> |
| A2-QUAL-00 | Qualité code/tests | Contexte Git | [Qualité](04-qualite-code-tests.html#a2-qual-00) | <span class="status documented">Documenté</span> |
| A2-QUAL-01 | Qualité code/tests | Installation des dépendances | [Qualité](04-qualite-code-tests.html#a2-qual-01) | <span class="status documented">Documenté</span> |
| A2-QUAL-02 | Qualité code/tests | Lint | [Qualité](04-qualite-code-tests.html#a2-qual-02) | <span class="status validated">Validé</span> |
| A2-QUAL-03 | Qualité code/tests | Typecheck | [Qualité](04-qualite-code-tests.html#a2-qual-03) | <span class="status validated">Validé</span> |
| A2-QUAL-04 | Qualité code/tests | Tests unitaires/intégration | [Qualité](04-qualite-code-tests.html#a2-qual-04) | <span class="status validated">Validé</span> |
| A2-QUAL-05 | Qualité code/tests | Coverage | [Qualité](04-qualite-code-tests.html#a2-qual-05) | <span class="status documented">Documenté</span> |
| A2-QUAL-06 | Qualité code/tests | Build | [Qualité](04-qualite-code-tests.html#a2-qual-06) | <span class="status validated">Validé</span> |
| A2-CICD-01 | CI/CD | Inventaire GitHub Actions | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-cicd-01) | <span class="status documented">Documenté</span> |
| A2-CICD-02 | CI/CD | Détail des jobs CI | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-cicd-02) | <span class="status documented">Documenté</span> |
| A2-CICD-03 | CI/CD | Workflow CD | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-cicd-03) | <span class="status documented">Documenté</span> |
| A2-CICD-04 | CI/CD | Workflow Docs Pages | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-cicd-04) | <span class="status documented">Documenté</span> |
| A2-CICD-05 | CI/CD | Run Docs Pages réussi | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-cicd-05) | <span class="status validated">Validé</span> |
| A2-DEPLOY-01 | Déploiement | Application publique | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-deploy-01) | <span class="status documented">Documenté</span> |
| A2-DEPLOY-02 | Déploiement | Smoke test de déploiement | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-deploy-02) | <span class="status todo">À compléter</span> |
| A2-DEPLOY-03 | Déploiement | Site documentaire public | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-deploy-03) | <span class="status documented">Documenté</span> |
| A2-DEPLOY-04 | Déploiement | Portail de preuves Bloc A2 | [CI/CD et déploiement](05-ci-cd-deploiement.html#a2-deploy-04) | <span class="status documented">Documenté</span> |

## Pages de preuves

| Page | Contenu |
| --- | --- |
| [01 - Architecture](01-architecture.html) | Structure monorepo, arborescence, documentation d'architecture, pattern API et structure frontend. |
| [02 - Fonctionnalités](02-fonctionnalites.html) | Parcours citoyen, agent, gestionnaire, administrateur, authentification et preuves API. |
| [03 - Stack technique](03-stack-technique.html) | Workspaces, frontend, backend, mobile, database, infrastructure et tooling. |
| [04 - Qualité, code et tests](04-qualite-code-tests.html) | Installation, lint, typecheck, tests, coverage, build et contexte Git. |
| [05 - CI/CD et déploiement](05-ci-cd-deploiement.html) | Workflows GitHub Actions, Docs Pages, application publique et portail de preuves. |
| [Annexe preuves](annexe-preuves.html) | Lecture des IDs, inventaire des catégories, matrice et points à compléter. |

## Points à suivre

- `A2-DEPLOY-02` reste à compléter : aucun fichier `A2-DEPLOY-02-*` n'était présent dans le proof pack.
- `A2-QUAL-01` documente une installation réussie, mais la sortie contient aussi des vulnérabilités `npm audit` à traiter ou expliquer séparément.
- `A2-QUAL-05` documente les pourcentages de coverage fournis, sans inventer de seuil qualité.
