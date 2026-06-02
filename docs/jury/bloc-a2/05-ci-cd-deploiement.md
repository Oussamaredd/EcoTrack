---
layout: default
title: "Bloc A2 - CI/CD et déploiement"
---

# Bloc A2 - Preuves CI/CD et déploiement

<nav class="proof-nav">
  <a href="{{ '/jury/bloc-a2/' | relative_url }}">Retour Bloc A2</a>
  <a href="{{ '/jury/bloc-a2/annexe-preuves.html' | relative_url }}">Annexe preuves</a>
  <a href="{{ '/index.html' | relative_url }}">Accueil documentation</a>
</nav>

Cette page rattache les preuves `A2-CICD-*` et `A2-DEPLOY-*` aux workflows, runs et captures de déploiement fournis. Les statuts ne reprennent que ce qui est visible dans les fichiers attachés.

<a id="a2-cicd-01"></a>
## A2-CICD-01: Inventaire GitHub Actions

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre la liste des workflows GitHub Actions disponibles pour le dépôt EcoTrack.

| Pièce | Légende jury |
| --- | --- |
| [A2-CICD-01-actions-workflows-list.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-CICD-01-actions-workflows-list.png' | relative_url }}) | Capture de l'onglet Actions listant les workflows du dépôt. |

**Liens source**
- [.github/workflows/CI.yaml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/CI.yaml)
- [.github/workflows/CD.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/CD.yml)
- [.github/workflows/docs-pages.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/docs-pages.yml)
- [.github/workflows/synthetic-monitoring.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/synthetic-monitoring.yml)

**Lecture jury**  
Cette preuve documente l'existence d'une automatisation CI/CD structurée dans GitHub Actions.

<a id="a2-cicd-02"></a>
## A2-CICD-02: Détail des jobs CI

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre un détail de jobs CI. Elle documente l'organisation du pipeline, sans inventer de résultat qui ne serait pas visible dans la capture.

| Pièce | Légende jury |
| --- | --- |
| [A2-CICD-02-ci-jobs-detail.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-CICD-02-ci-jobs-detail.png' | relative_url }}) | Capture du détail des jobs CI dans GitHub Actions. |

**Liens source**
- [.github/workflows/CI.yaml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/CI.yaml)
- [infrastructure/scripts/ci/](https://github.com/Oussamaredd/EcoTrack/tree/main/infrastructure/scripts/ci)
- [infrastructure/scripts/validate-workspace-toolchain.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/scripts/validate-workspace-toolchain.mjs)

**Lecture jury**  
Cette preuve permet de vérifier que la CI est découpée en jobs lisibles pour les validations frontend, mobile, backend, database, sécurité et images.

<a id="a2-cicd-03"></a>
## A2-CICD-03: Workflow CD

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre le fichier workflow CD dans GitHub.

| Pièce | Légende jury |
| --- | --- |
| [A2-CICD-03-cd-workflow-file.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-CICD-03-cd-workflow-file.png' | relative_url }}) | Capture du workflow CD, utilisée comme preuve d'existence et de lisibilité du fichier. |

**Liens source**
- [.github/workflows/CD.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/CD.yml)
- [infrastructure/scripts/ci/pre-deploy-validation.sh](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/scripts/ci/pre-deploy-validation.sh)
- [infrastructure/scripts/ci/run-release-smoke.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/scripts/ci/run-release-smoke.mjs)

**Lecture jury**  
Cette preuve documente l'automatisation de livraison, avec le fichier source consultable directement par le jury.

<a id="a2-cicd-04"></a>
## A2-CICD-04: Workflow Docs Pages

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre le workflow de publication de la documentation GitHub Pages.

| Pièce | Légende jury |
| --- | --- |
| [A2-CICD-04-docs-pages-workflow-file.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-CICD-04-docs-pages-workflow-file.png' | relative_url }}) | Capture du workflow `docs-pages.yml`, responsable de la publication du site documentaire. |

**Liens source**
- [.github/workflows/docs-pages.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/docs-pages.yml)
- [docs/_config.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/_config.yml)
- [docs/jury/bloc-a2/](https://github.com/Oussamaredd/EcoTrack/tree/main/docs/jury/bloc-a2)

**Lecture jury**  
Cette preuve relie le dossier de preuves à son mécanisme de publication documentaire.

<a id="a2-cicd-05"></a>
## A2-CICD-05: Run Docs Pages réussi

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La capture montre un run `Docs Pages` en statut `Success`, avec les jobs `Build Docs Site` et `Deploy Docs Site` réussis.

| Pièce | Légende jury |
| --- | --- |
| [A2-CICD-05-docs-pages-success-run.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-CICD-05-docs-pages-success-run.png' | relative_url }}) | Capture GitHub Actions montrant le run Docs Pages réussi et l'URL du site publié. |

**Liens source**
- [Run GitHub Actions visible dans la capture](https://github.com/Oussamaredd/EcoTrack/actions/runs/25606959572)
- [.github/workflows/docs-pages.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/docs-pages.yml)

**Lecture jury**  
Cette preuve valide la publication GitHub Pages pour le run capturé. Elle ne remplace pas une vérification en temps réel du site le jour du jury.

<a id="a2-deploy-01"></a>
## A2-DEPLOY-01: Application déployée

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre la page d'accueil applicative chargée depuis l'URL publique Cloudflare Pages.

| Pièce | Légende jury |
| --- | --- |
| [A2-DEPLOY-01-live-app-homepage.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-DEPLOY-01-live-app-homepage.png' | relative_url }}) | Capture de l'application EcoTrack ouverte depuis `ecotrack-jmj.pages.dev`. |

**Liens source**
- [app/Dockerfile](https://github.com/Oussamaredd/EcoTrack/blob/main/app/Dockerfile)
- [app/src/pages/landing/LandingPage.tsx](https://github.com/Oussamaredd/EcoTrack/blob/main/app/src/pages/landing/LandingPage.tsx)
- [docs/operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md)

**Lecture jury**  
Cette preuve documente une application accessible publiquement. Un smoke test daté reste nécessaire pour passer cette preuve en validation runtime complète.

<a id="a2-deploy-02"></a>
## A2-DEPLOY-02: Smoke test de déploiement

<p class="proof-status"><strong>Statut :</strong> <span class="status todo">À compléter</span></p>

Aucun fichier `A2-DEPLOY-02-*` n'était présent dans le proof pack. Les preuves API `A2-FUNC-API-*` documentent des endpoints en HTTP 200, mais elles sont conservées dans la page Fonctionnalités selon leur préfixe.

| Pièce | Légende jury |
| --- | --- |
| À fournir | Sortie datée d'un smoke test applicatif ou API, avec URL, statut HTTP et contexte d'exécution. |

**Liens source**
- [infrastructure/scripts/smoke-docker.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/scripts/smoke-docker.mjs)
- [infrastructure/scripts/ci/run-release-smoke.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/scripts/ci/run-release-smoke.mjs)
- [.github/workflows/synthetic-monitoring.yml](https://github.com/Oussamaredd/EcoTrack/blob/main/.github/workflows/synthetic-monitoring.yml)

**Lecture jury**  
Cette preuve reste à compléter si le jury attend une validation runtime distincte des captures navigateur et des endpoints documentés.

<a id="a2-deploy-03"></a>
## A2-DEPLOY-03: Site documentaire déployé

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre la page d'accueil du site documentaire GitHub Pages.

| Pièce | Légende jury |
| --- | --- |
| [A2-DEPLOY-03-docs-site-homepage.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-DEPLOY-03-docs-site-homepage.png' | relative_url }}) | Capture de la page d'accueil de la documentation publiée. |

**Liens source**
- [docs/index.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/index.md)
- [docs/documentation-index.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/documentation-index.md)
- [https://oussamaredd.github.io/EcoTrack/](https://oussamaredd.github.io/EcoTrack/)

**Lecture jury**  
Cette preuve documente l'accès au site de documentation public et son intégration au dossier de preuves.

<a id="a2-deploy-04"></a>
## A2-DEPLOY-04: Portail de preuves Bloc A2 déployé

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La preuve montre le portail Bloc A2 publié dans le site documentaire.

| Pièce | Légende jury |
| --- | --- |
| [A2-DEPLOY-04-docs-proof-portal.png]({{ '/assets/proofs/bloc-a2/ci-cd-deploiement/A2-DEPLOY-04-docs-proof-portal.png' | relative_url }}) | Capture du portail de preuves Bloc A2 dans GitHub Pages. |

**Liens source**
- [docs/jury/bloc-a2/index.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/jury/bloc-a2/index.md)
- [docs/jury/bloc-a2/annexe-preuves.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/jury/bloc-a2/annexe-preuves.md)
- [https://oussamaredd.github.io/EcoTrack/jury/bloc-a2/](https://oussamaredd.github.io/EcoTrack/jury/bloc-a2/)

**Lecture jury**  
Cette preuve documente l'accès public au dossier jury Bloc A2 et prépare la navigation vers les pages de preuve détaillées.
