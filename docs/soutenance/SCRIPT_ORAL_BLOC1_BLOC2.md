# Script oral - Soutenance EcoTrack Bloc 1 + Bloc 2

Objectif de timing : 13 a 15 minutes de slides, 4 a 5 minutes de demo live, puis une conclusion d'environ 1 minute.

## Slide 01 - Soutenance Bloc 1 & Bloc 2 - EcoTrack

- Temps estime : 30 sec
- Script oral : Bonjour, je presente EcoTrack, un projet autour de la gestion des dechets urbains. Le fil conducteur est simple : passer d'un signalement citoyen a une action terrain suivie. La soutenance couvre deux dimensions : le Bloc 1, avec l'organisation et le pilotage du projet, puis le Bloc 2, avec la conception, le developpement, les tests et le deploiement.
- Transition : Je commence par le probleme metier qui justifie le projet.

## Slide 02 - Probleme metier

- Temps estime : 30 sec
- Script oral : Le probleme principal est operationnel. Les signalements peuvent etre disperses, la priorisation n'est pas toujours claire, et le suivi terrain peut rester manuel. EcoTrack vise a centraliser ces informations pour aider a transformer un probleme observe en action planifiee, traçable et verifiable.
- Transition : Pour rendre ce besoin concret, je presente les utilisateurs concernes.

## Slide 03 - Utilisateurs et besoins

- Temps estime : 30 sec
- Script oral : Le projet est pense autour de quatre profils. Le citoyen signale et suit. L'agent consulte sa tournee et valide les actions. Le manager priorise et pilote l'activite. L'admin gere les utilisateurs, les roles et la gouvernance applicative. Ces roles structurent les ecrans, l'API et les donnees.
- Transition : Cette logique utilisateurs permet de comparer clairement l'avant et l'apres EcoTrack.

## Slide 04 - Avant / Apres EcoTrack

- Temps estime : 30 sec
- Script oral : Avant EcoTrack, le signalement reste plus isole et le suivi depend beaucoup de manipulations manuelles. Apres EcoTrack, le signalement arrive dans une boucle structuree : dashboard manager, planification, intervention agent et historique. L'objectif n'est pas de remplacer toute l'organisation, mais de mieux relier les etapes.
- Transition : Avant de parler technique, je montre comment le projet a ete organise dans le Bloc 1.

## Slide 05 - Organisation & planification

- Temps estime : 40 sec
- Script oral : Cette partie correspond au Bloc 1. J'ai cadre le projet avec une methode agile hybride : un backlog priorise, des sprints, des jalons, un suivi des risques et une comparaison entre livrables attendus et realises. Cette organisation a servi a garder un perimetre realiste et a preparer un developpement defendable.
- Transition : Ensuite, le pilotage montre comment les decisions ont ete transformees en preuves.

## Slide 06 - Pilotage du projet

- Temps estime : 40 sec
- Script oral : Le pilotage a consiste a controler le scope, faire des arbitrages et verifier regulierement que le projet restait demonstrable. Les quality gates, la preparation de la demo et le dossier de preuves evitent de rester au niveau declaratif. L'idee est : decision, action, preuve.
- Transition : Ce cadrage Bloc 1 supporte directement la boucle produit presentee en Bloc 2.

## Slide 07 - Solution EcoTrack - boucle produit

- Temps estime : 30 sec
- Script oral : La solution suit une boucle simple : signaler, enregistrer via l'API, prioriser, planifier, valider sur le terrain, puis tracer. Cette boucle sert de fil rouge pour la suite de la soutenance. Chaque choix technique doit aider ce parcours produit.
- Transition : Je precise maintenant ma contribution personnelle dans le developpement.

## Slide 08 - Ma contribution Developpement

- Temps estime : 30 sec
- Script oral : Ma contribution se concentre sur le developpement logiciel : monorepo, frontend web, mobile Expo, API NestJS, base PostgreSQL avec Drizzle, tests, build, CI/CD, deployment et documentation. Les sujets Data, Cyber ou IoT avances sont traites comme contexte ou perspectives, pas comme livrables principaux.
- Transition : Je cadre donc clairement ce qui est presente et ce qui reste en evolution.

## Slide 09 - Perimetre soutenance

- Temps estime : 30 sec
- Script oral : Dans cette soutenance, je presente le perimetre Development livre et verifiable. Les interfaces, l'API, la database, les tests, la CI/CD et la documentation sont au centre. Les capteurs IoT reels, le machine learning avance, la cyber avancee et l'industrialisation complete restent des perspectives d'evolution.
- Transition : Avec ce perimetre pose, je peux annoncer le scenario de demo.

## Slide 10 - Scenario de demonstration

- Temps estime : 30 sec
- Script oral : La demo suit un parcours court : un citoyen signale un conteneur plein, l'API reçoit la demande, la donnee est stockee, le manager la voit dans son espace, puis l'agent consulte sa tournee et valide une action. Le but est de prouver la coherence bout en bout.
- Transition : Avant la demo, je montre l'organisation technique du code.

## Slide 11 - Monorepo & responsibilities

- Temps estime : 35 sec
- Script oral : Le projet est organise en monorepo. Chaque dossier a une responsabilite claire : app pour le web, mobile pour Expo, api pour NestJS, database pour Drizzle et PostgreSQL, infrastructure pour les scripts et CI/CD, docs pour les preuves et runbooks. Cette separation aide a maintenir les couches.
- Transition : Cette organisation mene naturellement a l'architecture globale.

## Slide 12 - High-level architecture

- Temps estime : 35 sec
- Script oral : L'architecture se lit de gauche a droite. Les clients React et Expo consomment une REST API NestJS. Dans l'API, les Services portent la logique metier et les Repositories isolent l'acces aux donnees. La persistence repose sur PostgreSQL avec Drizzle. Les clients ne parlent jamais directement a la base.
- Transition : Je zoome maintenant sur le pattern backend.

## Slide 13 - Backend architecture - Controller / Service / Repository

- Temps estime : 35 sec
- Script oral : Le backend suit une separation Controller, Service, Repository. Le Controller gere HTTP, le Service orchestre la logique applicative, et le Repository concentre la persistence. Ce Repository Pattern rend le code plus testable et evite de melanger logique metier et requetes base de donnees.
- Transition : Ce backend expose ensuite des endpoints REST verifies.

## Slide 14 - REST API & verified endpoints

- Temps estime : 35 sec
- Script oral : Les endpoints presentes ici sont ceux que je peux defendre avec des preuves. Le health check repond, les zones sont consultables, le signalement citoyen passe par POST /api/citizen/reports, et les endpoints proteges sont testes avec authentification quand necessaire. Je fais attention a ne pas annoncer un endpoint non verifie.
- Transition : Derriere ces endpoints, il y a le modele de donnees.

## Slide 15 - Data model - main entities

- Temps estime : 35 sec
- Script oral : Le modele relie les principaux objets metier : users, roles, zones, containers, citizen reports, tours, stops, collection events, alertes, notifications et gamification. L'interet est de relier le signalement, la planification et la preuve de collecte dans un meme systeme coherent.
- Transition : Je passe maintenant a la couche frontend web.

## Slide 16 - Frontend web - routes, components, state

- Temps estime : 35 sec
- Script oral : Le frontend web n'est pas seulement une vitrine. Il gere les routes par role, les composants reutilisables, les appels API, les etats de chargement et les erreurs. Le dashboard manager et les vues operationnelles consomment les donnees de demonstration via l'application, ce qui donne des captures coherentes.
- Transition : Le mobile complete ce parcours avec un usage plus terrain.

## Slide 17 - Mobile app: field-oriented experience

- Temps estime : 30 sec
- Script oral : Le mobile est presente comme experience terrain. Avec Expo et React Native, l'application montre l'accueil citoyen, la recherche de conteneur sur carte et l'historique des signalements. L'idee importante est que le mobile s'integre au meme systeme et prepare les usages en situation de terrain.
- Transition : Je relie maintenant les preuves fonctionnelles citoyen et agent.

## Slide 18 - Functional proof - citizen + agent flow

- Temps estime : 30 sec
- Script oral : Cette slide montre le lien entre le citoyen et l'agent. Cote citoyen, un signalement est cree ou suivi. Cote agent, une tournee assignee permet de valider les interventions. On voit donc le passage entre demande entrante et action terrain.
- Transition : Je complete avec la vision manager et admin.

## Slide 19 - Functional proof - manager + admin flow

- Temps estime : 30 sec
- Script oral : Le manager utilise les KPI et les vues de planning pour prioriser. L'admin apporte la gestion des utilisateurs et des roles. Ce n'est pas seulement un parcours utilisateur : c'est aussi une preuve de pilotage applicatif et de gouvernance minimale.
- Transition : Apres les fonctions, je passe a la qualite technique.

## Slide 20 - Quality gates

- Temps estime : 30 sec
- Script oral : La qualite est structuree en pipeline : installation, lint, typecheck, tests, coverage, build et deployment. Ces etapes sont importantes car elles rendent la qualite reproductible. Le projet n'est pas seulement montre a l'ecran, il peut aussi etre verifie par commandes.
- Transition : Je montre ensuite les preuves mesurees de tests et coverage.

## Slide 21 - Tests & coverage - measured proof

- Temps estime : 30 sec
- Script oral : Ici, je resume les preuves qualite. Les tests passent, le lint passe, le typecheck passe, le build passe, la coverage est mesuree et les smoke checks API ont ete executes. Le chiffre n'est pas une promesse de perfection, mais une preuve que la base technique est verifiable.
- Transition : Ces checks sont aussi relies a la CI/CD et au deploiement.

## Slide 22 - CI/CD & deployment

- Temps estime : 30 sec
- Script oral : La CI/CD prouve que la livraison ne depend pas seulement de ma machine locale. GitHub Actions execute les workflows, verifie les checks et participe au deployment. Cela donne une trace lisible pour le jury : build, controle qualite et preuve de livraison.
- Transition : Pour retrouver toutes ces preuves, j'ai structure la documentation.

## Slide 23 - Documentation & proof portal

- Temps estime : 30 sec
- Script oral : La documentation et le portail de preuves servent a rendre le projet auditables. On y retrouve les choix d'architecture, les runbooks, les captures, les preuves API, la CI/CD et les limites. C'est important pour une soutenance : je ne demande pas seulement au jury de me croire.
- Transition : Je termine les points transverses avant la conclusion.

## Slide 24 - Responsible digital, accessibility, technical English

- Temps estime : 30 sec
- Script oral : Les sujets transverses sont traites comme des decisions de developpement. L'eco-conception passe par une architecture maintenable et des calculs utiles. L'accessibilite est prise en compte par les contrastes, le responsive et les points identifies. L'anglais technique apparait naturellement avec REST API, CI/CD, Repository Pattern, TypeScript, OWASP, coverage, build et deployment.
- Transition : Je conclus en reliant Bloc 1 et Bloc 2.

## Slide 25 - Conclusion

- Temps estime : 50 sec
- Script oral : Pour conclure, EcoTrack demontre deux choses. D'abord, une organisation projet maitrisee : cadrage, planning, arbitrages, risques et preuves. Ensuite, une application full-stack structuree, testee, deployee et documentee. J'ai construit une base logicielle defendable, j'ai apporte des preuves techniques, et je sais expliquer les ameliorations possibles sans sur-vendre le prototype.
- Transition : Apres cette conclusion, je passe a la demo live de 4 a 5 minutes.

## Annexe A1 - Preuves API

- Temps estime : backup
- Script oral : Annexe a ouvrir si le jury veut verifier les endpoints API et les statuts HTTP.
- Transition : Revenir a la question du jury.

## Annexe A2 - CI/CD

- Temps estime : backup
- Script oral : Annexe a utiliser pour detailler les workflows GitHub Actions et les preuves de livraison.
- Transition : Revenir a la question du jury.

## Annexe A3 - Dashboard manager

- Temps estime : backup
- Script oral : Annexe utile pour zoomer sur les KPI manager et la coherence des donnees de demonstration.
- Transition : Revenir a la question du jury.

## Annexe A4 - Planning & administration

- Temps estime : backup
- Script oral : Annexe pour montrer le planning, la heatmap, les users et les roles admin.
- Transition : Revenir a la question du jury.

## Annexe A5 - Mobile Expo

- Temps estime : backup
- Script oral : Annexe pour prouver que l'application mobile se lance et couvre plusieurs ecrans.
- Transition : Revenir a la question du jury.

## Annexe A6 - Portail de preuves

- Temps estime : backup
- Script oral : Annexe pour retrouver le portail GitHub Pages et les liens de documentation pendant les questions.
- Transition : Revenir a la question du jury.
