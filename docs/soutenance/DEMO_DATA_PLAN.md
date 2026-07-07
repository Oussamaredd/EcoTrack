# EcoTrack - Plan de donnees demo soutenance

## Objectif

Ce plan definit une couche de donnees demo deterministe pour preparer la soutenance EcoTrack sans inventer de metriques de production.

Les visuels de soutenance doivent distinguer en interne :

- `project proof` : preuve reelle issue du code, du repository, de la CI/CD, de la documentation ou du portail GitHub Pages.
- `seeded demo data` : donnees creees par le seed soutenance dans la base demo acceptee pour la soutenance.
- `generated diagram` : schema ou diagramme genere a partir de l'architecture reelle.
- `screenshot to capture` : capture a produire depuis l'application lancee avec les donnees demo.

Sur les slides finales, ne pas afficher d'etiquettes internes comme `MOCK_DEMO`. Si un visuel provient de donnees de demonstration, le presenter simplement comme "donnees de demonstration" dans la note orale ou dans une legende discrete.

## Commande

Commande racine avec opt-in explicite :

```bash
ALLOW_SOUTENANCE_SEED=true npm run seed:soutenance
```

Alias equivalent :

```bash
ALLOW_SOUTENANCE_SEED=true npm run demo:seed
```

Commande workspace :

```bash
ALLOW_SOUTENANCE_SEED=true npm run seed:soutenance --workspace=ecotrack-database
```

La commande :

1. compile le package `ecotrack-database`,
2. choisit la connexion seed avec la priorite `SOUTENANCE_DATABASE_URL`, puis `DATABASE_POOLER_URL`,
3. refuse les connexions qui ne pointent pas vers un host `pooler.supabase.com` en port `5432`,
4. affiche uniquement le host, le port, la base, `NODE_ENV` et l'etat du flag,
5. verifie `ALLOW_SOUTENANCE_SEED=true`,
6. exige `SOUTENANCE_DEMO_AUTH_HASH` avec un hash bcrypt dev-only,
7. ajoute ou met a jour uniquement les donnees demo soutenance scopees.

Le seed refuse toujours `NODE_ENV=production`. Il n'utilise pas `ALLOW_DATABASE_SEED_IN_PROD`.
Il ne doit pas utiliser un host direct de base de donnees pour la soutenance.

## Regle d'integrite

- Le seed ne supprime pas les donnees applicatives existantes.
- Les donnees demo sont scopees avec des codes/emails stables : `SOUT-*`, `soutenance.*@ecotrack.local`.
- Les roles applicatifs `citizen`, `agent`, `manager` et `admin` doivent deja exister ; le seed ne cree pas de roles globaux non scopes.
- Les IDs sont deterministes pour les entites principales afin de permettre des captures reproductibles.
- Les mesures IoT recentes utilisent une cle de jour pour rester fraiches pendant la preparation et eviter d'ecraser de l'historique hors demo.
- Les metriques visibles doivent etre presentees comme des indicateurs issus d'un environnement de demonstration, pas comme des chiffres de production.

## Dataset cree

| Domaine | Volume | Utilisation soutenance |
| --- | ---: | --- |
| Roles | 4 roles existants relies aux users demo | Montrer citoyen, agent, manager, admin |
| Utilisateurs | 10 users demo | Connexions et parcours par role |
| Zones | 6 zones `SOUT-ZONE-*` | Cartes, filtres, signalements par zone |
| Conteneurs | 30 conteneurs `SOUT-C-*` | KPI conteneurs critiques, remplissage, cartes |
| Types demo | 4 types `SOUT-TYPE-*`, 2 challenges `SOUT-CHL-*`, 3 anomalies `SOUT-ANOM-*` | References scopees pour rollback et audit |
| Capteurs / mesures | 30 capteurs + mesures + rollups | Dashboard, heatmap, evolution remplissage |
| Signalements citoyens | 24 signalements | Statuts new / in_progress / resolved |
| Tournees | 6 tournees | Tournee live agent, tournees planifiees/terminees |
| Arrets / collectes | Arrets par tournee + collectes validees | Demo validation agent et historique |
| Anomalies | 5 anomalies | Alertes terrain et preuve manager |
| Alertes | 6 alertes | KPI critiques et notifications manager |
| Gamification | 4 profils citoyens | Parcours citoyen et progression |
| Notifications | 3 notifications + recipients/deliveries | Preuve de boucle produit |
| Tickets support | 8 tickets | Dashboard legacy et KPI support |
| Exports / audits | exports + audit logs | Tracabilite, documentation, preuves |

Mot de passe des comptes demo locaux : defini hors Git par le hash `SOUTENANCE_DEMO_AUTH_HASH`.

## Comptes demo

| Role | Email |
| --- | --- |
| Citoyen | `soutenance.citizen1@ecotrack.local` |
| Citoyen | `soutenance.citizen2@ecotrack.local` |
| Citoyen | `soutenance.citizen3@ecotrack.local` |
| Citoyen | `soutenance.citizen4@ecotrack.local` |
| Agent | `soutenance.agent1@ecotrack.local` |
| Agent | `soutenance.agent2@ecotrack.local` |
| Agent | `soutenance.agent3@ecotrack.local` |
| Manager | `soutenance.manager1@ecotrack.local` |
| Manager | `soutenance.manager2@ecotrack.local` |
| Admin | `soutenance.admin@ecotrack.local` |

## Visuels supportes

### KPI cards

| KPI | Source | Remarque |
| --- | --- | --- |
| Signalements recus | `incident.citizen_reports` | 24 signalements demo |
| Signalements resolus | `incident.citizen_reports.status = resolved` | Calcul local/demo |
| Conteneurs critiques | `core.containers.fill_level_percent` + seuils types | Plusieurs conteneurs >= seuil critique |
| Tournees planifiees | `ops.tours.status = planned` | 3 tournees planifiees |
| Agents actifs | users demo role `agent` + tournees assignees | 3 agents demo |
| Taux de resolution | resolved / total signalements | A presenter comme demo seed |

### Charts

| Chart | Source | Utilisation |
| --- | --- | --- |
| Signalements par statut | `incident.citizen_reports` | Slide manager/admin ou preuve fonctionnelle |
| Signalements par zone | jointure reports -> containers/zones | Priorisation manager |
| Evolution des signalements | `reported_at` sur plusieurs heures/jours | Courbe temporelle demo |
| Repartition des niveaux de remplissage | `core.containers.fill_level_percent` | Histogramme / donuts |
| Tournees par agent | `ops.tours.assigned_agent_id` | Charge terrain |
| Collectes validees vs anomalies | `ops.collection_events` + `incident.anomaly_reports` | Fiabilite operationnelle |

### Parcours demo live

1. Le citoyen cree un signalement via `POST /api/citizen/reports`.
2. L'API enregistre le signalement et declenche les donnees de suivi.
3. Le manager retrouve le signalement dans le dashboard ou la liste.
4. L'agent ouvre sa tournee assignee `Soutenance - Tournee Centre Nord live`.
5. L'agent valide l'arret actif.
6. L'historique, les KPI et les preuves restent visibles apres l'action.

## Endpoints API verifies pour la soutenance

Ne pas presenter `GET /api/citizen/reports` comme endpoint verifie.

Endpoints candidats :

- `GET /api/health/ready`
- `GET /api/zones`
- `POST /api/citizen/reports`
- `GET /api/citizen-reports` uniquement comme endpoint de listing manager/admin, car il existe dans le code.

## Captures a produire apres seed

| Capture | Source | Statut |
| --- | --- | --- |
| Application web deployee / home | Project proof + screenshot | A capturer |
| Formulaire signalement citoyen | Seeded demo data + screenshot | A capturer |
| Historique citoyen | Seeded demo data + screenshot | A capturer |
| Dashboard manager | Seeded demo data + screenshot | A capturer |
| Detail tournee agent | Seeded demo data + screenshot | A capturer |
| Admin users/roles | Seeded demo data + screenshot | A capturer |
| Mobile Expo citoyen/agent/manager | Seeded demo data + screenshot | A capturer |
| CI/CD GitHub Actions | Project proof + screenshot | A capturer |
| Coverage/tests | Project proof + terminal/screenshot | A capturer |
| Portail GitHub Pages | Project proof + screenshot | A capturer |

## Limites assumees

- Les donnees ne sont pas des statistiques de production.
- Les capteurs et mesures IoT restent des donnees demo pour soutenir les dashboards et la heatmap.
- Les sujets Cyber/Data/IoT avances restent des dependances ou perspectives, conformement au perimetre Development.
- Les captures finales doivent venir de l'application lancee avec le seed quand c'est possible, pas de maquettes statiques.
