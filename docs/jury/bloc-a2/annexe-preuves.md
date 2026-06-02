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

Cette annexe centralise la lecture des IDs, les emplacements d'actifs et la matrice de rattachement des preuves Bloc A2. Les actifs du proof pack ont été copiés dans le dépôt afin que GitHub Pages reste autonome.

## Emplacement des actifs

| Catégorie | Dossier GitHub Pages | Contenu importé |
| --- | --- | --- |
| Architecture | `docs/assets/proofs/bloc-a2/architecture/` | Captures monorepo, arborescence, architecture overview, pattern API, structure frontend. |
| Fonctionnalités | `docs/assets/proofs/bloc-a2/fonctionnalites/` | Captures des parcours citoyen, agent, gestionnaire, administrateur et authentification. |
| Fonctionnalités API | `docs/assets/proofs/bloc-a2/fonctionnalites/api/` | Captures et sorties texte des endpoints health, zones et citizen reports. |
| Stack | `docs/assets/proofs/bloc-a2/stack/` | Captures des `package.json` root, frontend, API, mobile et database. |
| Qualité/tests | `docs/assets/proofs/bloc-a2/qualite-tests/` | Captures et sorties texte pour Git, install, lint, typecheck, tests, coverage et build. |
| CI/CD et déploiement | `docs/assets/proofs/bloc-a2/ci-cd-deploiement/` | Captures GitHub Actions, workflows, application publique et site documentaire. |

## Comment lire les IDs de preuve

| Segment | Signification | Exemple |
| --- | --- | --- |
| `A2` | Bloc évalué : concevoir et développer une application. | `A2-ARCH-01` |
| `ARCH` | Architecture et structure du projet. | `A2-ARCH-04` |
| `FUNC` | Fonctionnalités applicatives visibles. | `A2-FUNC-03` |
| `FUNC-API` | Preuves API rattachées aux fonctionnalités. | `A2-FUNC-API-02` |
| `STACK` | Stack technique et workspaces. | `A2-STACK-05` |
| `QUAL` | Qualité, code, tests, coverage et build. | `A2-QUAL-06` |
| `CICD` | Intégration et livraison continues. | `A2-CICD-05` |
| `DEPLOY` | Déploiement et exposition publique. | `A2-DEPLOY-04` |

## Matrice complète

| ID preuve | Élément démontré | Page | Pièces rattachées | Statut |
| --- | --- | --- | --- | --- |
| A2-ARCH-01 | Structure monorepo | [Architecture](01-architecture.html#a2-arch-01) | `A2-ARCH-01-github-repo-root.png` | <span class="status documented">Documenté</span> |
| A2-ARCH-02 | Arborescence locale et couches | [Architecture](01-architecture.html#a2-arch-02) | `A2-ARCH-02-local-tree.png`, `.txt` | <span class="status documented">Documenté</span> |
| A2-ARCH-03 | Vue d'ensemble architecture | [Architecture](01-architecture.html#a2-arch-03) | `A2-ARCH-03-architecture-overview.png` | <span class="status documented">Documenté</span> |
| A2-ARCH-04 | Pattern API controller/service/repository | [Architecture](01-architecture.html#a2-arch-04) | `A2-ARCH-04-api-controller.png`, `api-service.png`, `api-repository.png` | <span class="status documented">Documenté</span> |
| A2-ARCH-05 | Structure frontend | [Architecture](01-architecture.html#a2-arch-05) | `A2-ARCH-05-frontend-structure.png` | <span class="status documented">Documenté</span> |
| A2-FUNC-01 | Signalement citoyen | [Fonctionnalités](02-fonctionnalites.html#a2-func-01) | 3 captures citoyen report | <span class="status validated">Validé</span> |
| A2-FUNC-02 | Suivi citoyen, profil, gamification | [Fonctionnalités](02-fonctionnalites.html#a2-func-02) | 3 captures citoyen suivi/profil | <span class="status documented">Documenté</span> |
| A2-FUNC-03 | Parcours agent | [Fonctionnalités](02-fonctionnalites.html#a2-func-03) | 3 captures agent | <span class="status documented">Documenté</span> |
| A2-FUNC-04 | Parcours gestionnaire | [Fonctionnalités](02-fonctionnalites.html#a2-func-04) | 5 captures manager | <span class="status documented">Documenté</span> |
| A2-FUNC-05 | Parcours administrateur | [Fonctionnalités](02-fonctionnalites.html#a2-func-05) | 3 captures admin | <span class="status documented">Documenté</span> |
| A2-FUNC-06 | Authentification et route protégée | [Fonctionnalités](02-fonctionnalites.html#a2-func-06) | 3 captures auth/routing | <span class="status documented">Documenté</span> |
| A2-FUNC-API-01 | Health readiness HTTP 200 | [Fonctionnalités](02-fonctionnalites.html#a2-func-api-01) | Capture + sortie texte | <span class="status validated">Validé</span> |
| A2-FUNC-API-02 | Endpoint zones HTTP 200 | [Fonctionnalités](02-fonctionnalites.html#a2-func-api-02) | Capture + sortie texte | <span class="status validated">Validé</span> |
| A2-FUNC-API-03 | Endpoint citizen reports HTTP 200 | [Fonctionnalités](02-fonctionnalites.html#a2-func-api-03) | Capture + sortie texte | <span class="status validated">Validé</span> |
| A2-STACK-01 | Root workspaces | [Stack](03-stack-technique.html#a2-stack-01) | `A2-STACK-01-root-workspaces.png` | <span class="status documented">Documenté</span> |
| A2-STACK-02 | Frontend stack | [Stack](03-stack-technique.html#a2-stack-02) | `A2-STACK-02-frontend-package.png` | <span class="status documented">Documenté</span> |
| A2-STACK-03 | Backend stack | [Stack](03-stack-technique.html#a2-stack-03) | `A2-STACK-03-api-package.png` | <span class="status documented">Documenté</span> |
| A2-STACK-04 | Mobile stack | [Stack](03-stack-technique.html#a2-stack-04) | `A2-STACK-04-mobile-package.png` | <span class="status documented">Documenté</span> |
| A2-STACK-05 | Database stack | [Stack](03-stack-technique.html#a2-stack-05) | `A2-STACK-05-database-package.png` | <span class="status documented">Documenté</span> |
| A2-STACK-06 | Infrastructure et tooling | [Stack](03-stack-technique.html#a2-stack-06) | Liens source vers Docker, scripts et workflows | <span class="status documented">Documenté</span> |
| A2-QUAL-00 | Contexte Git | [Qualité](04-qualite-code-tests.html#a2-qual-00) | 2 captures Git | <span class="status documented">Documenté</span> |
| A2-QUAL-01 | Installation des dépendances | [Qualité](04-qualite-code-tests.html#a2-qual-01) | Capture + sortie `npm ci` | <span class="status documented">Documenté</span> |
| A2-QUAL-02 | Lint | [Qualité](04-qualite-code-tests.html#a2-qual-02) | Capture + sortie lint | <span class="status validated">Validé</span> |
| A2-QUAL-03 | Typecheck | [Qualité](04-qualite-code-tests.html#a2-qual-03) | Capture + sortie typecheck | <span class="status validated">Validé</span> |
| A2-QUAL-04 | Tests automatisés | [Qualité](04-qualite-code-tests.html#a2-qual-04) | Capture + sortie tests | <span class="status validated">Validé</span> |
| A2-QUAL-05 | Coverage | [Qualité](04-qualite-code-tests.html#a2-qual-05) | Capture + sortie coverage | <span class="status documented">Documenté</span> |
| A2-QUAL-06 | Build | [Qualité](04-qualite-code-tests.html#a2-qual-06) | Capture + sortie build | <span class="status validated">Validé</span> |
| A2-CICD-01 | Inventaire GitHub Actions | [CI/CD](05-ci-cd-deploiement.html#a2-cicd-01) | `A2-CICD-01-actions-workflows-list.png` | <span class="status documented">Documenté</span> |
| A2-CICD-02 | Détail jobs CI | [CI/CD](05-ci-cd-deploiement.html#a2-cicd-02) | `A2-CICD-02-ci-jobs-detail.png` | <span class="status documented">Documenté</span> |
| A2-CICD-03 | Workflow CD | [CI/CD](05-ci-cd-deploiement.html#a2-cicd-03) | `A2-CICD-03-cd-workflow-file.png` | <span class="status documented">Documenté</span> |
| A2-CICD-04 | Workflow Docs Pages | [CI/CD](05-ci-cd-deploiement.html#a2-cicd-04) | `A2-CICD-04-docs-pages-workflow-file.png` | <span class="status documented">Documenté</span> |
| A2-CICD-05 | Run Docs Pages réussi | [CI/CD](05-ci-cd-deploiement.html#a2-cicd-05) | `A2-CICD-05-docs-pages-success-run.png` | <span class="status validated">Validé</span> |
| A2-DEPLOY-01 | Application publique | [CI/CD](05-ci-cd-deploiement.html#a2-deploy-01) | `A2-DEPLOY-01-live-app-homepage.png` | <span class="status documented">Documenté</span> |
| A2-DEPLOY-02 | Smoke test de déploiement | [CI/CD](05-ci-cd-deploiement.html#a2-deploy-02) | Aucun fichier `A2-DEPLOY-02-*` fourni | <span class="status todo">À compléter</span> |
| A2-DEPLOY-03 | Site documentaire public | [CI/CD](05-ci-cd-deploiement.html#a2-deploy-03) | `A2-DEPLOY-03-docs-site-homepage.png` | <span class="status documented">Documenté</span> |
| A2-DEPLOY-04 | Portail preuves Bloc A2 | [CI/CD](05-ci-cd-deploiement.html#a2-deploy-04) | `A2-DEPLOY-04-docs-proof-portal.png` | <span class="status documented">Documenté</span> |

## Preuves validées

- `A2-FUNC-01`
- `A2-FUNC-API-01`
- `A2-FUNC-API-02`
- `A2-FUNC-API-03`
- `A2-QUAL-02`
- `A2-QUAL-03`
- `A2-QUAL-04`
- `A2-QUAL-06`
- `A2-CICD-05`

## Preuves à compléter ou à surveiller

| ID | Point d'attention |
| --- | --- |
| A2-DEPLOY-02 | Aucun smoke test de déploiement dédié n'a été fourni avec ce préfixe. |
| A2-QUAL-01 | La sortie `npm ci` est documentée, mais elle contient des vulnérabilités `npm audit`; ne pas la présenter comme preuve sécurité. |
| A2-QUAL-05 | Les pourcentages de coverage sont documentés depuis la sortie fournie ; aucun seuil de Quality Gate n'est ajouté ici. |

## Règle de mise à jour

Pour ajouter une nouvelle preuve, nommer le fichier avec l'ID correspondant, le placer dans le dossier de catégorie associé, puis mettre à jour la page détaillée et cette annexe. Un statut ne doit passer à `Validé` que si la pièce montre explicitement le résultat attendu.
