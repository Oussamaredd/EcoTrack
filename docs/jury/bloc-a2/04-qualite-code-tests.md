---
layout: default
title: "Bloc A2 - Qualité, code et tests"
---

# Bloc A2 - Preuves qualité, code et tests

<nav class="proof-nav">
  <a href="index.md">Retour Bloc A2</a>
  <a href="annexe-preuves.md">Annexe preuves</a>
  <a href="../../index.md">Accueil documentation</a>
</nav>

Cette page prépare les preuves de qualité. Les commandes ci-dessous sont des commandes attendues à exécuter et documenter ; aucune réussite n'est affirmée tant qu'une sortie terminal datée n'est pas attachée.

## Commandes à préparer

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

<a id="a2-qual-01"></a>
## A2-QUAL-01: Lint

**Command expected**

```bash
npm run lint
```

**Current repository references**
- `package.json`
- `app/package.json`
- `mobile/package.json`
- `api/package.json`

**Terminal output placeholder**  
À compléter avec la sortie réelle de la commande.

**Screenshot placeholder**  
À compléter avec une capture terminal ou CI.

**Date / commit SHA placeholder**  
Date : à compléter. Commit SHA : à compléter.

**Interpretation placeholder**  
À compléter avec l'interprétation de la sortie, sans modifier le résultat observé.

<div class="placeholder"><strong>Preuve attendue :</strong> sortie réelle de `npm run lint`.</div>

<a id="a2-qual-02"></a>
## A2-QUAL-02: Typecheck

**Command expected**

```bash
npm run typecheck
```

**Current repository references**
- `package.json`
- `app/tsconfig.json`
- `mobile/tsconfig.json`
- `api/tsconfig.json`
- `database/tsconfig.json`

**Terminal output placeholder**  
À compléter avec la sortie réelle de la commande.

**Screenshot placeholder**  
À compléter avec une capture terminal ou CI.

**Date / commit SHA placeholder**  
Date : à compléter. Commit SHA : à compléter.

**Interpretation placeholder**  
À compléter avec l'interprétation de la sortie TypeScript.

<div class="placeholder"><strong>Preuve attendue :</strong> sortie réelle de `npm run typecheck`.</div>

<a id="a2-qual-03"></a>
## A2-QUAL-03: Unit/integration tests

**Command expected**

```bash
npm run test
```

**Current repository references**
- `package.json`
- `app/src/tests/`
- `mobile/src/tests/`
- `api/src/tests/`

**Terminal output placeholder**  
À compléter avec la sortie réelle de la commande.

**Screenshot placeholder**  
À compléter avec une capture terminal ou CI.

**Date / commit SHA placeholder**  
Date : à compléter. Commit SHA : à compléter.

**Interpretation placeholder**  
À compléter avec le nombre réel de suites/tests exécutés uniquement si présent dans la sortie fournie.

<div class="placeholder"><strong>Preuve attendue :</strong> sortie réelle de `npm run test`.</div>

<a id="a2-qual-04"></a>
## A2-QUAL-04: Coverage

**Command expected**

```bash
npm run test:coverage
```

**Current repository references**
- `package.json`
- `app/package.json`
- `mobile/package.json`
- `api/package.json`
- [Quality scorecard](../../governance/QUALITY_SCORECARD.md)

**Terminal output placeholder**  
À compléter avec la sortie réelle de coverage.

**Screenshot placeholder**  
À compléter avec une capture du terminal, rapport coverage ou artefact CI.

**Date / commit SHA placeholder**  
Date : à compléter. Commit SHA : à compléter.

**Interpretation placeholder**  
À compléter avec les pourcentages réels uniquement s'ils sont fournis dans la sortie ou le rapport.

<div class="placeholder"><strong>Preuve attendue :</strong> rapport ou sortie réelle de `npm run test:coverage`.</div>

<a id="a2-qual-05"></a>
## A2-QUAL-05: Static analysis / quality scripts

**Command expected**

```bash
npm run build
```

Commandes complémentaires possibles à documenter si elles sont exécutées :

```bash
npm run validate-doc-sync
npm run validate:affected
npm run validate:full
```

**Current repository references**
- `package.json`
- `sonar-project.properties`
- `.github/workflows/CI.yaml`
- [Extended quality gates](../../operations/runbooks/EXTENDED_QUALITY_GATES.md)
- [Quality scorecard](../../governance/QUALITY_SCORECARD.md)

**Terminal output placeholder**  
À compléter avec la sortie réelle de build ou d'analyse statique.

**Screenshot placeholder**  
À compléter avec une capture terminal, CI ou outil qualité.

**Date / commit SHA placeholder**  
Date : à compléter. Commit SHA : à compléter.

**Interpretation placeholder**  
À compléter avec les contrôles réellement exécutés et leur résultat observé.

<div class="placeholder"><strong>Preuve attendue :</strong> sortie réelle de build ou d'un script qualité identifié.</div>

<a id="a2-qual-06"></a>
## A2-QUAL-06: Anomalies corrected

**Command expected**

```bash
npm run test
npm run build
```

**Current repository references**
- Historique Git à fournir lors de la prochaine passe.
- Issues, PRs ou commits de correction à rattacher.
- Tests ajoutés ou modifiés à préciser.

**Terminal output placeholder**  
À compléter avec les sorties avant/après si disponibles.

**Screenshot placeholder**  
À compléter avec une capture de l'anomalie, du correctif ou du résultat de validation.

**Date / commit SHA placeholder**  
Date : à compléter. Commit SHA : à compléter.

**Interpretation placeholder**  
À compléter avec le problème corrigé, l'impact et la validation associée.

<div class="placeholder"><strong>Preuve attendue :</strong> lien commit/PR, description de l'anomalie et validation après correction.</div>
