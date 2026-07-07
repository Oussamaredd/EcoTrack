# Storyboard - Soutenance EcoTrack

Statut : storyboard uniquement. Aucun PowerPoint n'est genere ou modifie a cette etape.

Objectif : construire une soutenance professionnelle centree sur le perimetre Developpement : produit livre, contribution personnelle, architecture, preuves fonctionnelles, qualite, CI/CD, documentation, limites et suites.

Format retenu : 23 slides principales. Les slides 24 et 25 de la structure initiale sont fusionnees dans la slide finale pour garder un rythme compatible avec 20 minutes : environ 13 minutes de slides, 4 a 5 minutes de demo live, puis une conclusion courte et positive. Les preuves detaillees passent en annexes.

## Timing global

| Partie | Temps cible |
| --- | ---: |
| Slides 01-17 : histoire produit + preuves fonctionnelles | 9 min |
| Demo live guidee | 4-5 min |
| Slides 18-23 : qualite, CI/CD, documentation, conclusion | 4 min |
| Conclusion orale finale | incluse slide 23 |

## Regles de contenu

- Slides visuelles : captures, schemas, KPI cards, timelines, diagrammes, tableaux courts.
- Texte minimal : une idee principale par slide.
- Notes presentateur : phrases simples en francais, utiles pour parler sans lire la slide.
- Termes techniques anglais acceptes naturellement : Stack, API, CI/CD, Controller, Service, Repository, Repository Pattern, TypeScript, NestJS, React, Drizzle, OWASP, coverage, build, deployment.
- Integrite : ne pas inventer de metriques de production. Les KPI et charts metier viennent du seed soutenance et doivent etre compris comme donnees de demonstration.
- Perimetre : Development specialty uniquement. Cyber/Data/IoT avances restent contexte, dependances ou perspectives.

## Slide 01 - EcoTrack, du signalement a l'action terrain

- Objective: ouvrir avec une promesse produit claire et defendable.
- Short slide content:
  - EcoTrack
  - Du signalement citoyen a l'action terrain
  - Web, mobile, API, database, CI/CD, documentation
  - Soutenance Bloc 2 - Developpement
- Speaker notes:
  - "Je presente EcoTrack comme un projet full-stack. Le fil conducteur est simple : un citoyen signale un probleme, l'information arrive dans le systeme, le gestionnaire priorise, puis l'agent intervient et valide l'action."
- Main visual idea: capture hero de l'application avec bandeau titre bleu/noir/blanc.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/proof/github-pages-proof-portal.png`
  - `docs/soutenance/assets/screenshots/web/web-manager-dashboard.png`
  - README, portail GitHub Pages.
- Data source: project proof + captured screenshot.
- Estimated speaking time: 20 sec.

## Slide 02 - Probleme metier

- Objective: expliquer le besoin avant de parler technique.
- Short slide content:
  - Signalements disperses
  - Priorisation difficile
  - Manque de suivi terrain
  - Besoin : transformer un signal en action suivie
- Speaker notes:
  - "Le probleme est operationnel. Si les signalements ne sont pas centralises et relies a la planification, le gestionnaire manque de visibilite et l'agent n'a pas toujours une priorite claire."
- Main visual idea: avant EcoTrack en 3 points de friction.
- Evidence/proof/assets needed: rapport A1 contexte/enjeux, rapport A2 perimetre.
- Data source: project proof + generated diagram.
- Estimated speaking time: 30 sec.

## Slide 03 - Utilisateurs et besoins

- Objective: montrer les profils et la valeur par role.
- Short slide content:
  - Citoyen : signaler, suivre, contribuer
  - Agent : voir sa tournee, valider, remonter une anomalie
  - Manager : prioriser, planifier, piloter
  - Admin : gerer users, roles, audit
- Speaker notes:
  - "Je presente le projet par utilisateurs, car c'est plus concret qu'une liste de modules. Chaque role correspond a des ecrans, des API et des donnees que je peux demontrer."
- Main visual idea: 4 cartes role avec icones sobres.
- Evidence/proof/assets needed: README, docs fonctionnelles Bloc A2, screenshots users/roles.
- Data source: project proof + seeded demo data.
- Estimated speaking time: 30 sec.

## Slide 04 - Avant / Apres EcoTrack

- Objective: faire comprendre l'impact produit en une comparaison simple.
- Short slide content:
  - Avant : signalement isole, suivi manuel, priorite floue
  - Apres : signalement centralise, dashboard, tournee, preuve de collecte
- Speaker notes:
  - "Cette slide sert a rendre le changement lisible. EcoTrack ne remplace pas toute une organisation, mais il structure la boucle entre citoyens, managers et agents."
- Main visual idea: tableau 2 colonnes Avant / Apres.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/web/citizen-report-form.png`
  - `docs/soutenance/assets/screenshots/web/web-manager-dashboard.png`
  - `docs/soutenance/assets/screenshots/web/agent-tour-details.png`
- Data source: seeded demo data + captured screenshot.
- Estimated speaking time: 30 sec.

## Slide 05 - Solution EcoTrack - boucle produit

- Objective: poser le fil rouge de la soutenance.
- Short slide content:
  - 1. Signaler
  - 2. Enregistrer via API
  - 3. Prioriser
  - 4. Planifier
  - 5. Valider terrain
  - 6. Tracer et documenter
- Speaker notes:
  - "Toute la soutenance suit cette boucle. Cela me permet ensuite de relier les choix techniques aux usages reels : API, database, dashboard, mobile, tests et deployment."
- Main visual idea: boucle circulaire produit avec 6 etapes.
- Evidence/proof/assets needed: storyboard demo, endpoints, dashboard, agent tour.
- Data source: generated diagram + seeded demo data.
- Estimated speaking time: 35 sec.

## Slide 06 - Ma contribution Developpement

- Objective: repondre directement a "qu'avez-vous construit ?".
- Short slide content:
  - Monorepo architecture
  - Frontend web React
  - Mobile Expo / React Native
  - Backend API NestJS
  - Database Drizzle/PostgreSQL
  - Tests, coverage, build
  - CI/CD, deployment
  - Documentation et proof dossier
- Speaker notes:
  - "Ici je cadre ma contribution. Je defends le developpement logiciel : les interfaces, l'API, la base, les tests, la livraison et la documentation. Les autres specialites sont mentionnees seulement comme contexte ou perspectives."
- Main visual idea: carte "Dev ownership" au centre, 8 blocs autour.
- Evidence/proof/assets needed: repo structure, docs Bloc A2, GitHub Pages, package scripts.
- Data source: project proof.
- Estimated speaking time: 30 sec.

## Slide 07 - Perimetre soutenance

- Objective: cadrer proprement ce qui est livre et ce qui reste hors perimetre.
- Short slide content:
  - Livre : web, mobile, API, database, tests, CI/CD, deployment, docs
  - Hors perimetre assume : hardware IoT reel, ML prediction, Data Science avancee, Cyber avance, industrialisation complete
  - Position : prototype logiciel defendu sur Development
- Speaker notes:
  - "Je ne sur-vends pas le projet. Je montre ce qui est livre et verifiable. Les capteurs reels, le machine learning et les controles cyber avances restent des dependances ou des pistes futures."
- Main visual idea: tableau "Livre" / "Hors perimetre assume".
- Evidence/proof/assets needed: AGENTS scope Development only, README, roadmap, rapports.
- Data source: project proof.
- Estimated speaking time: 30 sec.

## Slide 08 - Scenario de demonstration

- Objective: preparer le jury au parcours live de 4-5 minutes.
- Short slide content:
  - Citoyen signale un conteneur plein
  - API recoit la demande
  - Donnee stockee
  - Manager la voit
  - Agent valide une collecte
  - Historique et preuve restent visibles
- Speaker notes:
  - "La demo sera courte. Je ne vais pas tout parcourir, mais suivre ce scenario pour prouver la coherence : creation, API, stockage, dashboard, terrain, trace."
- Main visual idea: sequence horizontale avec fleches et miniatures.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/web/citizen-report-form.png`
  - `docs/soutenance/assets/screenshots/api/api-terminal-proof.png`
  - `docs/soutenance/assets/screenshots/web/web-manager-dashboard.png`
  - `docs/soutenance/assets/screenshots/web/agent-tour-details.png`
- Data source: seeded demo data + captured screenshots + API proof capture.
- Estimated speaking time: 35 sec.

## Slide 09 - Monorepo & responsibilities

- Objective: prouver l'organisation du code et les responsabilites par couche.
- Short slide content:
  - `app` : web UI, routes, state, API consumption
  - `mobile` : Expo / React Native field usage
  - `api` : NestJS Controller / Service / Repository
  - `database` : Drizzle schema, migrations, seeds
  - `infrastructure` : Docker, scripts, CI/CD
  - `docs` : architecture, runbooks, proofs
- Speaker notes:
  - "Le monorepo garde toutes les couches ensemble, mais chaque dossier a une responsabilite claire. Cela aide aussi a lancer des checks par workspace."
- Main visual idea: screenshot arborescence repo + callouts.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/repo/monorepo-structure.png`
  - `AGENTS.md`
  - package workspaces.
- Data source: project proof + generated proof visual.
- Estimated speaking time: 30 sec.

## Slide 10 - High-level architecture

- Objective: expliquer le flux technique principal.
- Short slide content:
  - Web / Mobile
  - REST API NestJS
  - Services metier
  - Repositories
  - PostgreSQL / Drizzle
  - CI/CD + docs autour du delivery
- Speaker notes:
  - "Les clients ne parlent pas directement a la base. Ils passent par l'API. Dans l'API, je separe Controller, Service et Repository pour garder un code maintenable et testable."
- Main visual idea: schema Web/Mobile -> API NestJS -> Services -> Repositories -> PostgreSQL.
- Evidence/proof/assets needed: architecture docs, code modules API/database.
- Data source: generated diagram + project proof.
- Estimated speaking time: 40 sec.

## Slide 11 - Backend architecture - Controller / Service / Repository

- Objective: montrer le Repository Pattern sur un exemple concret.
- Short slide content:
  - Controller : entree HTTP
  - Service : logique applicative
  - Repository : persistence
  - Exemple : citizen reports / tours
- Speaker notes:
  - "C'est une decision importante : je garde les requetes base de donnees dans les repositories. Le Controller reste proche de HTTP, le Service orchestre, le Repository isole la persistence."
- Main visual idea: 3 colonnes avec extraits code Controller, Service, Repository.
- Evidence/proof/assets needed: `api/src/modules/citizen/*`, `api/src/modules/reports/*`, `api/src/modules/collections/*`.
- Data source: project proof + screenshot to capture.
- Estimated speaking time: 35 sec.

## Slide 12 - REST API & verified endpoints

- Objective: corriger et prouver les endpoints defendus.
- Short slide content:
  - `GET /api/health/ready`
  - `GET /api/zones`
  - `POST /api/citizen/reports`
  - `GET /api/citizen-reports` pour listing manager/admin si capturee
  - Authenticated requests pour les parcours proteges
- Speaker notes:
  - "Je fais attention aux endpoints. Le signalement citoyen est bien un POST sur `/api/citizen/reports`. Je ne presente pas `GET /api/citizen/reports` comme endpoint verifie."
- Main visual idea: carte API avec methodes HTTP et badges verified.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/api/api-terminal-proof.png`
  - `docs/soutenance/assets/screenshots/api/api-terminal-proof.txt`
  - controllers NestJS, OpenAPI/docs API.
- Data source: project proof + captured API terminal proof.
- Estimated speaking time: 35 sec.

## Slide 13 - Data model - main entities

- Objective: montrer la structure de donnees utile au produit.
- Short slide content:
  - Users / roles
  - Zones / containers
  - Citizen reports
  - Tours / stops / collection events
  - Alerts / notifications / audit logs
  - Gamification profiles
- Speaker notes:
  - "Le modele relie les besoins metier : qui signale, ou se trouve le conteneur, quelle tournee est assignee, quelle collecte est validee, et quelle trace reste dans le systeme."
- Main visual idea: ERD simplifie, sans toutes les tables techniques.
- Evidence/proof/assets needed: Drizzle schema, migrations, seed soutenance, DB docs.
- Data source: generated diagram + project proof + seeded demo data.
- Estimated speaking time: 35 sec.

## Slide 14 - Frontend web - routes, components, state

- Objective: prouver que le frontend est une vraie couche produit.
- Short slide content:
  - Routes par role
  - Components reutilisables
  - Hooks API
  - State / cache / invalidation
  - Responsive dashboard
- Speaker notes:
  - "Le frontend ne se limite pas a des pages statiques. Il consomme l'API, gere les etats de chargement, les erreurs, les routes protegees et les rafraichissements apres action."
- Main visual idea: capture dashboard web + mini schema route -> hook -> API.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/web/web-manager-dashboard.png`
  - `docs/soutenance/assets/screenshots/web/planning-dashboard-heatmap.png`
  - `app/src/pages/*`, hooks dashboard/planning/citizen.
- Data source: project proof + seeded demo data + captured screenshots.
- Estimated speaking time: 35 sec.

## Slide 15 - Mobile app: field-oriented experience

- Objective: garder le mobile comme preuve terrain, sans l'exagerer.
- Short slide content:
  - Expo / React Native
  - Home citoyen : points, challenges, raccourcis
  - Report map : recherche conteneur + carte terrain
  - History : suivi des signalements
  - Shared API integration
  - Usage terrain mobile-first
- Speaker notes:
  - "Le mobile est utile pour le terrain. Je montre trois ecrans maximum pour rester lisible : accueil, signalement avec carte, puis historique. L'objectif est de prouver que le parcours citoyen mobile existe et consomme la meme API que le web."
- Main visual idea: 3 phone frames max, avec `mobile-home.jpg`, `mobile-report-map.jpg`, `mobile-history.jpg`.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/mobile/mobile-home.jpg`
  - `docs/soutenance/assets/screenshots/mobile/mobile-report-map.jpg`
  - `docs/soutenance/assets/screenshots/mobile/mobile-history.jpg`
- Data source: project proof + seeded demo data + Expo screenshots.
- Estimated speaking time: 30 sec.

## Slide 16 - Functional proof - citizen + agent flow

- Objective: prouver le flux citoyen et agent avant la demo live.
- Short slide content:
  - Citizen report form
  - Citizen history
  - Agent assigned tour
  - Active stop validation
  - Collection event created
- Speaker notes:
  - "Cette slide montre que le parcours est complet. Le citoyen cree un signalement, et cote terrain l'agent a une tournee avec un arret actif qu'il peut valider."
- Main visual idea: deux colonnes, citoyen a gauche, agent a droite.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/web/citizen-report-form.png`
  - `docs/soutenance/assets/screenshots/web/citizen-history-profile.png`
  - `docs/soutenance/assets/screenshots/web/agent-tour-details.png`
- Data source: seeded demo data + captured screenshots.
- Estimated speaking time: 35 sec.

## Slide 17 - Functional proof - manager + admin flow

- Objective: montrer pilotage, roles et preuve de gouvernance applicative.
- Short slide content:
  - Manager dashboard
  - KPI et alertes
  - Liste signalements
  - Admin users / roles
  - Audit logs
- Speaker notes:
  - "Le manager pilote l'operationnel avec des indicateurs et des alertes. L'admin prouve la partie gestion des utilisateurs, roles et audit, ce qui est important pour une application professionnelle."
- Main visual idea: dashboard manager + admin users/roles.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/web/web-manager-dashboard.png`
  - `docs/soutenance/assets/screenshots/web/planning-dashboard-heatmap.png`
  - `docs/soutenance/assets/screenshots/web/admin-users-roles.png`
  - `docs/soutenance/assets/data/soutenance-proof-data.json`
- Data source: seeded demo data + captured screenshots + proof data manifest.
- Estimated speaking time: 35 sec.

## Slide 18 - Quality gates - npm ci, lint, typecheck, tests, coverage, build

- Objective: transformer la qualite en pipeline lisible.
- Short slide content:
  - `npm ci`
  - `lint`
  - `typecheck`
  - `tests`
  - `coverage`
  - `build`
  - `deploy`
- Speaker notes:
  - "La qualite est defendue par des checks repetables, pas seulement par une impression visuelle. L'objectif est de montrer que le code peut etre installe, verifie, teste, compile et livre."
- Main visual idea: pipeline horizontal avec portes de qualite.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/proof/github-actions-ci-cd.png`
  - package scripts, CI workflow, local validation summary.
- Data source: project proof + captured GitHub Actions proof + generated diagram.
- Estimated speaking time: 35 sec.

## Slide 19 - Tests & coverage - measured proof

- Objective: montrer des preuves mesurees de maintenabilite.
- Short slide content:
  - Tests unitaires / integration selon workspace
  - Coverage report
  - TypeScript type safety
  - Regression locks sur parcours cles
- Speaker notes:
  - "Je ne dis pas seulement que le projet est teste. Je montre les commandes, le coverage et quelques tests lies aux parcours critiques : API, dashboard, agent tour, mobile."
- Main visual idea: capture coverage + table courte par workspace.
- Evidence/proof/assets needed: `npm run test:coverage`, rapports coverage existants, tests app/api/mobile.
- Data source: project proof + screenshot to capture.
- Estimated speaking time: 30 sec.

## Slide 20 - CI/CD & deployment

- Objective: prouver que la livraison est automatisee et reproductible.
- Short slide content:
  - GitHub Actions
  - Build database/app/api
  - Quality checks
  - Deployment
  - Live app proof
- Speaker notes:
  - "La CI/CD montre que le projet n'est pas seulement local. Les checks sont automatises, le build est verifie et le deployment donne une preuve visible."
- Main visual idea: capture GitHub Actions + capture app deployee.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/proof/github-actions-ci-cd.png`
  - `docs/soutenance/assets/screenshots/proof/github-pages-proof-portal.png`
  - workflows GitHub Actions.
- Data source: project proof + captured screenshots.
- Estimated speaking time: 35 sec.

## Slide 21 - Documentation & proof portal

- Objective: montrer que la soutenance s'appuie sur un dossier de preuves.
- Short slide content:
  - Architecture docs
  - API docs
  - Runbooks
  - Proof portal GitHub Pages
  - Tracabilite Bloc A2
- Speaker notes:
  - "La documentation sert a defendre le projet. Elle permet au jury de retrouver les preuves, les choix, les commandes, les captures et les limites."
- Main visual idea: carte du portail de preuves + liens docs principaux.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/proof/github-pages-proof-portal.png`
  - `https://oussamaredd.github.io/EcoTrack/`, docs jury, API docs, runbooks.
- Data source: project proof + captured screenshot.
- Estimated speaking time: 30 sec.

## Slide 22 - Responsible digital, accessibility, technical English

- Objective: couvrir les attentes transverses sans sortir du perimetre Dev.
- Short slide content:
  - Eco-conception : assets optimises, calculs utiles, architecture maintenable
  - Accessibilite : contraste, responsive, navigation clavier a verifier
  - Technical English : REST API, CI/CD, Repository Pattern, TypeScript, OWASP, coverage, build, deployment
  - Scope responsable : ne pas sur-industrialiser un prototype scolaire
- Speaker notes:
  - "Je presente ces sujets comme des decisions de developpement. L'anglais technique est naturel dans le projet : API, CI/CD, Repository Pattern, coverage, build et deployment."
- Main visual idea: 3 cartes Responsable / Accessible / Technical English.
- Evidence/proof/assets needed: accessibility runbook, docs architecture, quality docs, OWASP references if included in docs.
- Data source: project proof + generated diagram.
- Estimated speaking time: 30 sec.

## Slide 23 - Conclusion - decisions, apprentissages et suite

- Objective: conclure positivement sans lister seulement les manques.
- Short slide content:
  - Difficultes : scope, integration multi-couches, preuves, qualite
  - Decisions : monorepo, API REST, Repository Pattern, seed demo, CI/CD
  - Apprentissages : livrer un produit defendable, pas un simple rapport
  - Suite : captures finales, durcissement accessibilite, industrialisation progressive
  - Message final : EcoTrack est credible pour une soutenance Bloc 2 Development
- Speaker notes:
  - "Je conclus sur ce qui est defendable : un projet full-stack structure, avec des parcours utilisateurs, une architecture claire, des donnees demo coherentes, des tests, une CI/CD et une documentation. Les limites sont assumees, mais elles n'annulent pas la valeur du travail de developpement."
- Main visual idea: slide finale forte avec 3 blocs "J'ai construit / J'ai prouve / Je sais ameliorer".
- Evidence/proof/assets needed: synthese deck + proof portal + demo data plan.
- Data source: project proof + seeded demo data.
- Estimated speaking time: 45 sec.

## Annexes backup

Les annexes ne sont pas dans le temps principal. Elles servent uniquement si le jury demande une preuve supplementaire.

### Annexe A1 - API endpoint terminal captures

- Objective: prouver les endpoints verifies.
- Visual: terminal `curl` ou client API.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/api/api-terminal-proof.png`
  - `docs/soutenance/assets/screenshots/api/api-terminal-proof.txt`
  - `GET /api/health/ready`
  - `GET /api/zones`
  - `POST /api/citizen/reports`
  - `GET /api/citizen-reports`
  - `GET /api/dashboard`
  - `GET /api/tours/agent/me`
- Data source: project proof + seeded demo data + captured API terminal proof.

### Annexe A2 - CI/CD workflow captures

- Objective: montrer les checks GitHub Actions.
- Visual: capture workflow, job details, statut.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/proof/github-actions-ci-cd.png`
  - GitHub Actions, workflow YAML.
- Data source: project proof + captured screenshot.

### Annexe A3 - Coverage output

- Objective: avoir un backup pour les questions qualite.
- Visual: sortie coverage ou HTML report.
- Evidence/proof/assets needed: commandes coverage app/mobile/api.
- Data source: project proof + screenshot to capture.

### Annexe A4 - DB schema / ERD

- Objective: detailler le modele si le jury questionne la database.
- Visual: ERD plus complet que la slide 13.
- Evidence/proof/assets needed: Drizzle schema, migrations, seed soutenance.
- Data source: generated diagram + project proof.

### Annexe A5 - Mobile screenshots

- Objective: prouver que l'app mobile se lance et consomme l'API.
- Visual: captures Expo complementaires.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/mobile/mobile-signin.jpg`
  - `docs/soutenance/assets/screenshots/mobile/mobile-profile.jpg`
  - `docs/soutenance/assets/screenshots/mobile/mobile-schedule.jpg`
  - `docs/soutenance/assets/screenshots/mobile/mobile-challenges.jpg`
- Data source: seeded demo data + Expo screenshots.

### Annexe A6 - Proof portal map

- Objective: retrouver rapidement les preuves pendant les questions.
- Visual: carte du portail GitHub Pages et liens docs.
- Evidence/proof/assets needed:
  - `docs/soutenance/assets/screenshots/proof/github-pages-proof-portal.png`
  - proof portal, docs jury, runbooks.
- Data source: project proof + captured screenshot.
