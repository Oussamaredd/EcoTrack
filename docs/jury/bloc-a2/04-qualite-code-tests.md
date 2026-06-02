---
layout: default
title: "Bloc A2 - Qualité, code et tests"
---

# Bloc A2 - Preuves qualité, code et tests

<nav class="proof-nav">
  <a href="{{ '/jury/bloc-a2/' | relative_url }}">Retour Bloc A2</a>
  <a href="{{ '/jury/bloc-a2/annexe-preuves.html' | relative_url }}">Annexe preuves</a>
  <a href="{{ '/index.html' | relative_url }}">Accueil documentation</a>
</nav>

Cette page rattache les preuves `A2-QUAL-*` aux commandes et sorties fournies dans le proof pack. Les résultats ci-dessous reprennent uniquement ce qui est visible dans les captures ou fichiers texte attachés.

<a id="a2-qual-00"></a>
## A2-QUAL-00: Contexte Git de la preuve

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

Le pack contient des captures de contexte Git. Elles servent à situer les commandes, sans remplacer un lien de commit ou de run CI.

| Pièce | Légende jury |
| --- | --- |
| [A2-QUAL-00-git-status.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-00-git-status.png' | relative_url }}) | Capture du statut Git local au moment de constitution du pack. |
| [A2-QUAL-00-latest-commit.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-00-latest-commit.png' | relative_url }}) | Capture du dernier commit visible au moment de constitution du pack. |

**Liens source**
- [Historique du dépôt](https://github.com/Oussamaredd/EcoTrack/commits/main)

**Lecture jury**  
Ces pièces aident à rattacher les sorties terminal à un état de travail, mais le commit exact doit rester vérifié avec l'historique GitHub si nécessaire.

<a id="a2-qual-01"></a>
## A2-QUAL-01: Installation des dépendances

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La sortie fournie montre l'exécution de `npm ci --include=dev`. Elle indique l'installation de paquets et signale aussi des vulnérabilités `npm audit`; cette preuve ne doit donc pas être lue comme une validation sécurité.

| Pièce | Légende jury |
| --- | --- |
| [A2-QUAL-01-npm-ci-success.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-01-npm-ci-success.png' | relative_url }}) | Capture terminal de l'installation des dépendances. |
| [A2-QUAL-01-npm-ci-output.txt]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-01-npm-ci-output.txt' | relative_url }}) | Sortie brute `npm ci --include=dev`, avec warnings et audit report conservés. |

**Liens source**
- [package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/package.json)
- [package-lock.json](https://github.com/Oussamaredd/EcoTrack/blob/main/package-lock.json)
- [infrastructure/scripts/install-git-hooks.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/scripts/install-git-hooks.mjs)

**Lecture jury**  
La preuve documente la reproductibilité de l'installation. Les vulnérabilités `npm audit` visibles dans la sortie restent à traiter ou à expliquer séparément.

<a id="a2-qual-02"></a>
## A2-QUAL-02: Lint

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La sortie fournie montre `npm run lint` avec les workspaces `app`, `mobile` et `api` terminés en code `0`.

| Pièce | Légende jury |
| --- | --- |
| [A2-QUAL-02-lint-success.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-02-lint-success.png' | relative_url }}) | Capture terminal du lint réussi. |
| [A2-QUAL-02-lint-output.txt]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-02-lint-output.txt' | relative_url }}) | Sortie brute montrant les validations lint par workspace et le theme contract frontend. |

**Liens source**
- [package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/package.json)
- [app/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/app/package.json)
- [mobile/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/package.json)
- [api/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/api/package.json)
- [app/scripts/validate-theme-contract.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/app/scripts/validate-theme-contract.mjs)

**Lecture jury**  
Cette preuve valide que le contrôle lint s'est terminé sans erreur sur les workspaces listés dans la sortie.

<a id="a2-qual-03"></a>
## A2-QUAL-03: Typecheck

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La sortie fournie montre `npm run typecheck` avec `app`, `mobile`, `api` et `database` terminés en code `0`.

| Pièce | Légende jury |
| --- | --- |
| [A2-QUAL-03-typecheck-success.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-03-typecheck-success.png' | relative_url }}) | Capture terminal du typecheck réussi. |
| [A2-QUAL-03-typecheck-output.txt]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-03-typecheck-output.txt' | relative_url }}) | Sortie brute montrant le typecheck par workspace. |

**Liens source**
- [app/tsconfig.json](https://github.com/Oussamaredd/EcoTrack/blob/main/app/tsconfig.json)
- [mobile/tsconfig.json](https://github.com/Oussamaredd/EcoTrack/blob/main/mobile/tsconfig.json)
- [api/tsconfig.json](https://github.com/Oussamaredd/EcoTrack/blob/main/api/tsconfig.json)
- [database/tsconfig.json](https://github.com/Oussamaredd/EcoTrack/blob/main/database/tsconfig.json)

**Lecture jury**  
Cette preuve valide que les surfaces TypeScript principales passent le contrôle de typage présenté dans la sortie.

<a id="a2-qual-04"></a>
## A2-QUAL-04: Tests unitaires et intégration

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La sortie fournie montre l'exécution de `npm run test`. La fin de la sortie jointe affiche notamment `Test Files 81 passed (81)` et `Tests 420 passed (420)` pour la suite API.

| Pièce | Légende jury |
| --- | --- |
| [A2-QUAL-04-tests-success.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-04-tests-success.png' | relative_url }}) | Capture terminal du résultat de test fourni. |
| [A2-QUAL-04-tests-output.txt]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-04-tests-output.txt' | relative_url }}) | Sortie brute de `npm run test`, conservée sans réécriture. |

**Liens source**
- [app/src/tests/](https://github.com/Oussamaredd/EcoTrack/tree/main/app/src/tests)
- [mobile/src/tests/](https://github.com/Oussamaredd/EcoTrack/tree/main/mobile/src/tests)
- [api/src/tests/](https://github.com/Oussamaredd/EcoTrack/tree/main/api/src/tests)
- [api/vitest.config.ts](https://github.com/Oussamaredd/EcoTrack/blob/main/api/vitest.config.ts)

**Lecture jury**  
Cette preuve valide l'exécution de tests automatisés visible dans la sortie jointe. Les nombres affichés doivent être lus depuis le fichier brut, car ils correspondent à la sortie fournie au moment de la capture.

<a id="a2-qual-05"></a>
## A2-QUAL-05: Coverage

<p class="proof-status"><strong>Statut :</strong> <span class="status documented">Documenté</span></p>

La sortie fournie montre `npm run test:coverage` et un rapport de coverage. Le résumé visible indique `All files` à `86.35%` statements, `75.35%` branches, `88.14%` functions et `86.44%` lines. Le fichier brut doit rester la source de vérité.

| Pièce | Légende jury |
| --- | --- |
| [A2-QUAL-05-coverage-summary.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-05-coverage-summary.png' | relative_url }}) | Capture du résumé de coverage fourni. |
| [A2-QUAL-05-coverage-output.txt]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-05-coverage-output.txt' | relative_url }}) | Sortie brute de coverage, incluant les warnings et le tableau détaillé. |

**Liens source**
- [sonar-project.properties](https://github.com/Oussamaredd/EcoTrack/blob/main/sonar-project.properties)
- [docs/governance/QUALITY_SCORECARD.md](https://github.com/Oussamaredd/EcoTrack/blob/main/docs/governance/QUALITY_SCORECARD.md)
- [infrastructure/scripts/validate-sonar-coverage-alignment.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/infrastructure/scripts/validate-sonar-coverage-alignment.mjs)

**Lecture jury**  
Cette preuve documente les valeurs de coverage visibles dans le rapport fourni. Elle n'invente pas de seuil de validation et ne remplace pas un Quality Gate SonarCloud.

<a id="a2-qual-06"></a>
## A2-QUAL-06: Build

<p class="proof-status"><strong>Statut :</strong> <span class="status validated">Validé</span></p>

La sortie fournie montre `npm run build`, avec build API terminé en code `0`, build frontend terminé, puis `npm run build:app exited with code 0`.

| Pièce | Légende jury |
| --- | --- |
| [A2-QUAL-06-build-success.png]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-06-build-success.png' | relative_url }}) | Capture terminal du build réussi. |
| [A2-QUAL-06-build-output.txt]({{ '/assets/proofs/bloc-a2/qualite-tests/A2-QUAL-06-build-output.txt' | relative_url }}) | Sortie brute du build, incluant les bundles générés et le bundle size check. |

**Liens source**
- [package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/package.json)
- [app/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/app/package.json)
- [api/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/api/package.json)
- [database/package.json](https://github.com/Oussamaredd/EcoTrack/blob/main/database/package.json)
- [app/scripts/run-bundle-size-check.mjs](https://github.com/Oussamaredd/EcoTrack/blob/main/app/scripts/run-bundle-size-check.mjs)

**Lecture jury**  
Cette preuve valide que la génération des artefacts applicatifs s'est terminée correctement dans la sortie fournie.
