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

Cette page prépare les preuves CI/CD et déploiement. Les workflows existants sont référencés comme éléments documentaires ; les exécutions réussies, captures et validations runtime restent à joindre.

<a id="a2-cicd-01"></a>
## A2-CICD-01: CI workflow

**What the jury should verify**
- Le workflow CI existe dans le dépôt.
- Les jobs couvrent les validations attendues du projet.
- Une exécution GitHub Actions réussie est rattachée à un commit précis.

**Workflow file**
- [`.github/workflows/CI.yaml`](https://github.com/Oussamaredd/EcoTrack/blob/develop/.github/workflows/CI.yaml)

**GitHub Actions run URL placeholder**
- À compléter avec l'URL d'un run CI pertinent.

**Deployment / CI screenshot placeholder**
- À compléter avec une capture du run CI.

**Commit SHA and date placeholder**
- Commit SHA : à compléter.
- Date : à compléter.

**Interpretation placeholder**
- À compléter avec les jobs réellement exécutés et leur résultat observé.

<div class="placeholder"><strong>Preuve attendue :</strong> lien du run CI, capture et commit associé.</div>

<a id="a2-cicd-02"></a>
## A2-CICD-02: CD workflow

**What the jury should verify**
- Le workflow CD existe dans le dépôt.
- Le workflow documente les étapes de build, déploiement ou vérification applicative.
- Un run CD pertinent est rattaché à un commit et à une cible.

**Workflow file**
- [`.github/workflows/CD.yml`](https://github.com/Oussamaredd/EcoTrack/blob/develop/.github/workflows/CD.yml)

**GitHub Actions run URL placeholder**
- À compléter avec l'URL d'un run CD pertinent.

**Deployment screenshot placeholder**
- À compléter avec une capture du run ou de la cible de déploiement.

**Commit SHA and date placeholder**
- Commit SHA : à compléter.
- Date : à compléter.

**Interpretation placeholder**
- À compléter avec les étapes réellement validées par le workflow.

<div class="placeholder"><strong>Preuve attendue :</strong> lien du run CD, capture et cible concernée.</div>

<a id="a2-cicd-03"></a>
## A2-CICD-03: GitHub Actions successful run

**What the jury should verify**
- Le run GitHub Actions est terminé avec succès.
- Le run correspond au commit ou à la branche présentée au jury.
- Les artefacts ou logs nécessaires sont consultables.

**Workflow files candidates**
- [CI workflow](https://github.com/Oussamaredd/EcoTrack/blob/develop/.github/workflows/CI.yaml)
- [CD workflow](https://github.com/Oussamaredd/EcoTrack/blob/develop/.github/workflows/CD.yml)
- [Docs Pages workflow](https://github.com/Oussamaredd/EcoTrack/blob/develop/.github/workflows/docs-pages.yml)
- [Synthetic monitoring workflow](https://github.com/Oussamaredd/EcoTrack/blob/develop/.github/workflows/synthetic-monitoring.yml)

**GitHub Actions run URL placeholder**
- À compléter avec l'URL exacte du run réussi.

**Screenshot placeholder**
- À compléter avec une capture du statut réussi.

**Commit SHA and date placeholder**
- Commit SHA : à compléter.
- Date : à compléter.

**Interpretation placeholder**
- À compléter avec la lecture du run et les jobs passés.

<div class="placeholder"><strong>Preuve attendue :</strong> URL GitHub Actions d'un run réussi et capture associée.</div>

<a id="a2-deploy-01"></a>
## A2-DEPLOY-01: Deployed application

**What the jury should verify**
- L'application déployée s'ouvre depuis l'URL publique.
- Les écrans présentés correspondent au périmètre EcoTrack.
- Les preuves de smoke test ou captures sont datées.

**Existing documentation references**
- URL applicative référencée dans les notes existantes : [https://ecotrack-jmj.pages.dev](https://ecotrack-jmj.pages.dev)
- [Deployment platform rollout plan](../../operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md)
- [PR tasks](../../planning/tasks/PR_TASKS.md)

**Deployment screenshot placeholder**
- À compléter avec une capture de l'application déployée.

**Smoke / health proof placeholder**
- À compléter avec la sortie d'un smoke test ou d'une vérification manuelle documentée.

**Commit SHA and date placeholder**
- Commit SHA : à compléter.
- Date : à compléter.

**Interpretation placeholder**
- À compléter avec le périmètre réellement vérifié sur l'application.

<div class="placeholder"><strong>Preuve attendue :</strong> capture de l'application déployée et vérification datée.</div>

<a id="a2-deploy-02"></a>
## A2-DEPLOY-02: Docs Pages deployment

**What the jury should verify**
- Le site documentaire est déployé via GitHub Pages.
- Le workflow utilise Jekyll avec `source: ./docs` et `destination: ./_site`.
- Les liens fonctionnent sous le chemin projet `/EcoTrack`.

**Workflow file**
- [`.github/workflows/docs-pages.yml`](https://github.com/Oussamaredd/EcoTrack/blob/develop/.github/workflows/docs-pages.yml)

**Existing docs URL**
- [https://oussamaredd.github.io/EcoTrack/](https://oussamaredd.github.io/EcoTrack/)

**GitHub Actions run URL placeholder**
- À compléter avec l'URL d'un run Docs Pages réussi.

**Deployment screenshot placeholder**
- À compléter avec une capture du site documentation déployé.

**Commit SHA and date placeholder**
- Commit SHA : à compléter.
- Date : à compléter.

**Interpretation placeholder**
- À compléter avec la validation réelle du déploiement Pages et de la navigation.

<div class="placeholder"><strong>Preuve attendue :</strong> run Docs Pages, capture du site déployé et commit associé.</div>

<a id="a2-deploy-03"></a>
## A2-DEPLOY-03: Smoke test / health check

**What the jury should verify**
- Un test minimal confirme que l'application et/ou l'API répondent.
- Les commandes, URLs et résultats sont fournis sans modification.
- La date, le commit et l'environnement sont identifiés.

**Current repository references**
- `package.json`
- `.github/workflows/synthetic-monitoring.yml`
- [Deployment platform rollout plan](../../operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md)
- [Observability and reliability](../../operations/runbooks/OBSERVABILITY_AND_RELIABILITY.md)

**Command / URL placeholders**

```bash
npm run smoke-test
```

```bash
curl -f <application-or-api-health-url>
```

**Terminal output placeholder**
- À compléter avec la sortie réelle.

**Screenshot placeholder**
- À compléter avec une capture terminal, navigateur ou monitoring.

**Commit SHA and date placeholder**
- Commit SHA : à compléter.
- Date : à compléter.

**Interpretation placeholder**
- À compléter avec le résultat observé et les limites du test.

<div class="placeholder"><strong>Preuve attendue :</strong> sortie de smoke test ou health check datée.</div>
