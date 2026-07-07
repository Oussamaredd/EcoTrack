# Script oral - Soutenance EcoTrack Bloc 3 + Bloc 4

Objectif de timing : 13 a 15 minutes de slides, 4 a 5 minutes de demonstration ou focus preuve, puis environ 1 minute de conclusion. Les annexes sont reservees aux questions du jury.

## Slide 01 - EcoTrack - Soutenance Bloc 3 & Bloc 4

- Temps estime : 35 sec
- Script oral : Bonjour, je presente EcoTrack pour les Blocs 3 et 4. Le Bloc 3 montre comment le projet est controle, securise, mesure, maintenu et prepare pour la mise en production. Le Bloc 4 montre comment le travail d'equipe a ete organise : roles, backlog, decisions, coordination et bilan collectif. L'idee centrale est de montrer un prototype full-stack verifiable, mais aussi pilote comme un projet collectif.
- Transition : Je commence par une synthese rapide des deux blocs.

## Slide 02 - Executive summary

- Temps estime : 40 sec
- Script oral : La soutenance est structuree en deux lectures. Cote Bloc 3, je parle de CI/CD, deployment, quality gates, securite applicative, performance et maintenabilite. Cote Bloc 4, je parle de coordination d'equipe, gouvernance, backlog, rituels, risques et amelioration continue. Les deux blocs se completent : la qualite operationnelle depend aussi d'un pilotage clair.
- Transition : Je precise maintenant le contexte de mise en production.

## Slide 03 - Bloc 3 - contexte production-readiness

- Temps estime : 40 sec
- Script oral : Pour EcoTrack, production-readiness signifie rester honnete sur le niveau du projet. Ce n'est pas une plateforme industrielle haute disponibilite. C'est un prototype scolaire avec une application deployee, une API, une base Supabase, GitHub Actions, des quality gates, des runbooks et un proof portal. Le but est de montrer que la livraison est controlee et verifiable.
- Transition : Cette preparation repose d'abord sur le pipeline CI/CD.

## Slide 04 - CI/CD pipeline

- Temps estime : 45 sec
- Script oral : Le pipeline suit une logique classique : commit, installation, lint, typecheck, tests, coverage, build, deployment et publication des preuves. Chaque etape reduit un type de risque : erreur de code, regression, probleme TypeScript, build casse ou preuve manquante. C'est la colonne vertebrale du Bloc 3.
- Transition : Je passe ensuite a la partie DevSecOps.

## Slide 05 - DevSecOps applicatif

- Temps estime : 50 sec
- Script oral : La securite presentee reste dans le perimetre Development. Elle couvre les controles applicatifs : Helmet pour les headers, CORS allowlist, ValidationPipe, limites de payload, request ID, logs structures et tests negatifs. Le projet integre aussi Semgrep SAST, un hook ZAP baseline, Trivy pour les images et une logique Dependabot ou audit dependances comme axe de suivi.
- Transition : Une fois les controles poses, il faut expliquer comment le deploiement est organise.

## Slide 06 - Strategie de deploiement

- Temps estime : 45 sec
- Script oral : La strategie de deploiement reste volontairement simple. Le frontend est cible sur Cloudflare Pages, l'API NestJS sur Render, la base et l'authentification sur Supabase, et la documentation sur GitHub Pages. Je ne revendique pas Kubernetes ou de haute disponibilite industrielle. Pour un incident, l'idee de rollback est de revenir a un ref Git connu ou de faire un forward fix selon le cas.
- Transition : Pour exploiter une application, il faut aussi observer et documenter les incidents.

## Slide 07 - Observability & runbooks

- Temps estime : 45 sec
- Script oral : EcoTrack dispose d'une base d'observabilite : health checks, readiness, logs structures, request ID, traces et metriques Prometheus quand l'environnement est configure. Les runbooks definissent les probes, les smoke checks, les SLO objectifs et la classification des incidents. Ici encore, je distingue ce qui est repo-owned de ce qui depend d'un vrai compte de monitoring externe.
- Transition : Je montre maintenant les mesures de performance disponibles.

## Slide 08 - Performance - mesures et budgets

- Temps estime : 50 sec
- Script oral : Le rapport A3 donne des mesures concretes : Lighthouse sur la landing page, login et dashboard, des budgets de bundle et des outils de charge comme k6, autocannon, Clinic.js et pgbench. Je presente les resultats comme des preuves de controle, pas comme des metriques de trafic production. L'objectif est de montrer que le projet sait mesurer avant d'optimiser.
- Transition : La performance n'a de valeur que si le projet reste maintenable.

## Slide 09 - Maintenabilite

- Temps estime : 45 sec
- Script oral : La maintenabilite repose sur plusieurs choix : monorepo, TypeScript, modules NestJS, Repository Pattern, migrations Drizzle, Definition of Done, scorecard qualite et documentation versionnee. Le point important est que la connaissance n'est pas seulement dans ma tete : elle est dans le repository, les runbooks et le proof portal.
- Transition : Je resume alors ce que valide le Bloc 3.

## Slide 10 - Synthese Bloc 3

- Temps estime : 35 sec
- Script oral : Le Bloc 3 montre qu'EcoTrack n'est pas seulement fonctionnel. Le projet est controle par des quality gates, mesure par des outils de performance, securise au niveau applicatif, documente et prepare pour une maintenance progressive. Les limites sont connues et formulees comme des axes d'amelioration.
- Transition : Je passe maintenant au Bloc 4, donc au pilotage de l'equipe.

## Slide 11 - Bloc 4 - contexte equipe

- Temps estime : 40 sec
- Script oral : Le Bloc 4 porte sur une equipe de quatre etudiants. Mon role presente est celui de referent projet et lead coordination. Cela signifie cadrer, organiser le backlog, suivre les branches, arbitrer les priorites, aider a l'integration et preparer la livraison. Le pilotage n'est pas seulement administratif : il conditionne la qualite finale.
- Transition : Je presente l'organisation de l'equipe.

## Slide 12 - Organisation de l'equipe

- Temps estime : 40 sec
- Script oral : L'organisation est volontairement simple : un referent projet pour garder la coherence globale, et trois contributeurs qui interviennent sur le developpement, les corrections, les tests, la documentation ou la preparation de demo selon les priorites. Cette structure evite de perdre le fil sur un projet avec web, mobile, API, database et documentation.
- Transition : Pour repartir le travail, il fallait analyser les competences.

## Slide 13 - Competences et ecarts

- Temps estime : 45 sec
- Script oral : Les competences attendues couvraient le frontend, le backend, la database, la qualite, les bases DevOps, la documentation et la communication. Les ecarts ont ete geres par la repartition des taches, l'aide entre membres, la documentation et des revues courtes. L'objectif n'etait pas que chacun sache tout faire, mais que l'equipe puisse livrer ensemble.
- Transition : Cette repartition est clarifiee par une matrice RACI.

## Slide 14 - Gouvernance et RACI

- Temps estime : 50 sec
- Script oral : La matrice RACI sert a clarifier qui est responsable, qui valide, qui est consulte et qui est informe. Pour EcoTrack, le referent projet est garant du backlog, de l'architecture globale, de l'integration et du dossier de preuves. Les contributeurs sont responsables de lots de developpement ou de validation. Cela limite les ambiguities pendant l'integration.
- Transition : Je montre ensuite les rituels et outils de collaboration.

## Slide 15 - Rituels agiles et outils

- Temps estime : 45 sec
- Script oral : Les rituels etaient adaptes au contexte etudiant : cadrage initial, repartition des taches, points d'avancement, revues d'integration, arbitrages techniques et preparation de demo. Les outils principaux sont Jira pour le backlog, GitHub pour les branches et l'historique, et les docs pour garder les decisions visibles.
- Transition : Un bon pilotage doit aussi traiter les risques et les conflits.

## Slide 16 - Risques et gestion des conflits

- Temps estime : 50 sec
- Script oral : Les risques principaux etaient le perimetre trop large, les dependances entre taches, les conflits Git, les niveaux techniques differents, la documentation tardive et l'instabilite de demo. La reponse a ete le scope control, le decoupage, les branches par sujet, l'accompagnement, la documentation progressive et les validations avant demo.
- Transition : Ces risques ont mene a plusieurs decisions de pilotage.

## Slide 17 - Decisions de pilotage

- Temps estime : 45 sec
- Script oral : J'utilise ici le format decision, action, preuve. Par exemple, le choix de rester sur le scope Development rend la livraison plus claire. Les branches par sujet reduisent les conflits. Les quality gates stabilisent la demo. La documentation prepare le jury. Chaque decision doit produire une action observable et une preuve.
- Transition : Je parle ensuite de performance collective et de montee en competences.

## Slide 18 - Performance collective et montee en competences

- Temps estime : 45 sec
- Script oral : La performance d'equipe a ete suivie de maniere pragmatique : avancement du backlog, blocages, qualite des integrations, stabilite de la demo et production des preuves. Les progres viennent surtout de la clarification des objectifs, du decoupage des taches, de l'entraide technique et des supports documentes.
- Transition : Le pilotage inclut aussi l'inclusion, l'accessibilite et les pratiques d'equipe.

## Slide 19 - Inclusion, accessibilite et pratiques d'equipe

- Temps estime : 40 sec
- Script oral : Sur le Bloc 4, l'inclusion signifie surtout rendre le travail lisible et accessible a l'equipe : consignes claires, charge repartie, droit de signaler un blocage, supports ecrits et communication directe. L'accessibilite produit est aussi suivie dans la logique Development : contrastes, responsive et points d'accessibilite identifies.
- Transition : Je peux maintenant synthetiser le Bloc 4.

## Slide 20 - Synthese Bloc 4

- Temps estime : 35 sec
- Script oral : Le Bloc 4 montre que le projet a ete pilote comme un travail collectif organise. Le backlog, les roles, les branches, les rituels, les arbitrages, la documentation et le bilan forment une methode de coordination. Ce n'est pas parfait, mais c'est structure et ameliorable.
- Transition : Je relie maintenant les deux blocs.

## Slide 21 - Conclusion croisee Bloc 3 + Bloc 4

- Temps estime : 45 sec
- Script oral : Les deux blocs se renforcent. Le Bloc 3 prouve la qualite operationnelle : pipeline, securite, performance, runbooks, maintenabilite. Le Bloc 4 prouve la capacite a organiser une equipe pour produire ces livrables : backlog, roles, decisions et gestion des risques. Ensemble, ils montrent un projet techniquement controle et collectivement livre.
- Transition : Je termine par la conclusion finale.

## Slide 22 - Conclusion finale

- Temps estime : 55 sec
- Script oral : Pour conclure, EcoTrack demontre une mise en production maitrisee et un pilotage d'equipe structure autour d'un prototype full-stack verifiable. Je ne presente pas une infrastructure industrielle fictive. Je presente un projet Development avec des preuves : CI/CD, quality gates, securite applicative, performance, documentation, backlog et coordination d'equipe.
- Transition : Les annexes sont disponibles pour approfondir les preuves pendant les questions.

## Annexe A1 - CI/CD proof

- Temps estime : backup
- Script oral : Annexe a ouvrir si le jury veut voir les workflows CI/CD, les jobs GitHub Actions ou le lien entre pipeline et artefacts.
- Transition : Revenir a la question du jury.

## Annexe A2 - Security / performance proof

- Temps estime : backup
- Script oral : Annexe utile pour detailler les controles de securite applicative, Semgrep, ZAP, Trivy, Lighthouse et les outils de performance.
- Transition : Revenir a la question du jury.

## Annexe A3 - Lighthouse / coverage / tests

- Temps estime : backup
- Script oral : Annexe pour justifier les chiffres de couverture, les scores Lighthouse et les budgets de bundle.
- Transition : Revenir a la question du jury.

## Annexe A4 - Backlog / roadmap proof

- Temps estime : backup
- Script oral : Annexe pour rattacher le pilotage A4 au backlog, a la roadmap et aux decisions de scope.
- Transition : Revenir a la question du jury.

## Annexe A5 - RACI / team governance

- Temps estime : backup
- Script oral : Annexe pour detailler la matrice RACI et la repartition des responsabilites.
- Transition : Revenir a la question du jury.

## Annexe A6 - Proof portal / docs map

- Temps estime : backup
- Script oral : Annexe pour retrouver rapidement le portail GitHub Pages, les runbooks et les documents de preuve.
- Transition : Revenir a la question du jury.
