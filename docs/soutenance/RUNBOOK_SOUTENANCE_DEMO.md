# Runbook - Soutenance demo EcoTrack

Objectif : preparer une demo de 4 a 5 minutes avec des donnees coherentes, des captures propres et un plan de secours.

Ce runbook ne genere pas le PowerPoint. Il sert a preparer les preuves visuelles qui seront integrees plus tard dans le deck.

## 1. Preparation locale

Depuis la racine du repo :

```bash
npm ci --include=dev
npm run validate:workspace-toolchain
```

Verifier que l'environnement pointe vers une base de developpement/demo ou vers la base Supabase acceptee pour la soutenance, pas vers une base de production.

Endpoints locaux attendus :

- Frontend local : `http://localhost:5173`
- API locale : `http://localhost:3001/api`
- Readiness API : `http://localhost:3001/api/health/ready`

Si la base locale n'est pas disponible, demarrer l'environnement de developpement selon la configuration du repo :

```bash
npm run infra:up
```

## 2. Connexion seed et donnees soutenance

Le seed soutenance utilise une connexion dediee :

- `SOUTENANCE_DATABASE_URL` si elle est definie,
- sinon `DATABASE_POOLER_URL`.

La connexion doit pointer vers le Supabase pooler en mode session : host `pooler.supabase.com`, port `5432`.
Le seed refuse les hosts directs de base de donnees pour eviter les erreurs reseau de type IPv6 `ENETUNREACH`.

Ne pas lancer de migration pour les donnees de presentation : le seed utilise uniquement le schema existant.

Charger les donnees demo :

```bash
ALLOW_SOUTENANCE_SEED=true npm run seed:soutenance
```

Alias equivalent :

```bash
ALLOW_SOUTENANCE_SEED=true npm run demo:seed
```

Le seed :

- exige `ALLOW_SOUTENANCE_SEED=true`,
- exige `SOUTENANCE_DEMO_AUTH_HASH` avec un hash bcrypt dev-only pour les comptes demo locaux,
- refuse toujours `NODE_ENV=production`,
- affiche le host, le port, la base, `NODE_ENV` et l'etat du flag sans afficher le mot de passe,
- garde les donnees existantes,
- met a jour les donnees scopees `SOUT-*`,
- cree 10 utilisateurs demo, 6 zones, 30 conteneurs, 24 signalements, 6 tournees, alertes, anomalies, notifications, gamification, audit logs,
- exige que les roles `citizen`, `agent`, `manager` et `admin` existent deja,
- n'appelle pas le seed de base existant.

Comptes demo locaux crees en base :

| Role | Email | Password |
| --- | --- | --- |
| Citoyen | `soutenance.citizen1@ecotrack.local` | mot de passe correspondant a `SOUTENANCE_DEMO_AUTH_HASH` |
| Agent | `soutenance.agent1@ecotrack.local` | mot de passe correspondant a `SOUTENANCE_DEMO_AUTH_HASH` |
| Manager | `soutenance.manager1@ecotrack.local` | mot de passe correspondant a `SOUTENANCE_DEMO_AUTH_HASH` |
| Admin | `soutenance.admin@ecotrack.local` | mot de passe correspondant a `SOUTENANCE_DEMO_AUTH_HASH` |

Note importante : le frontend web utilise une session navigateur Supabase. Les comptes ci-dessus sont utilisables pour les preuves API locales via `/api/login`. Pour les captures UI web/mobile, utiliser une session Supabase configuree ou des comptes de demo deja disponibles dans l'environnement cible, puis verifier que l'API pointe vers la base seedee.

## 3. Lancer l'application

Terminal 1 :

```bash
npm run dev
```

Attendre que :

- l'API reponde sur `http://localhost:3001/api/health/ready`,
- le frontend reponde sur `http://localhost:5173`.

Verifier :

```bash
curl -f http://localhost:3001/api/health/ready
```

Lancer le mobile si necessaire :

```bash
npm run mobile:env:android-emulator
npm run dev:mobile
```

Variantes utiles :

```bash
npm run mobile:env:ios-simulator
npm run mobile:env:lan
npm run mobile:start:tunnel
```

## 4. Preuves API en terminal

Ne pas utiliser `GET /api/citizen/reports` comme preuve.

### Bash / WSL

Login local API :

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"soutenance.citizen1@ecotrack.local","password":"<demo-password>"}' \
  | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>console.log(JSON.parse(data).accessToken));")
```

Health :

```bash
curl -f http://localhost:3001/api/health/ready
```

Zones :

```bash
curl -f "http://localhost:3001/api/zones?page=1&pageSize=5"
```

Recuperer un conteneur demo :

```bash
CONTAINER_ID=$(curl -s "http://localhost:3001/api/containers?q=SOUT-C-002&page=1&pageSize=1" \
  | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>console.log(JSON.parse(data).containers[0].id));")
```

Creer un signalement citoyen :

```bash
curl -f -X POST http://localhost:3001/api/citizen/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"containerId\":\"$CONTAINER_ID\",\"reportType\":\"container_full\",\"description\":\"Signalement live soutenance : conteneur plein.\",\"latitude\":\"48.866120\",\"longitude\":\"2.347900\"}"
```

Listing manager/admin si token manager disponible :

```bash
MANAGER_TOKEN=$(curl -s -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"soutenance.manager1@ecotrack.local","password":"<demo-password>"}' \
  | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>console.log(JSON.parse(data).accessToken));")

curl -f "http://localhost:3001/api/citizen-reports?page=1&pageSize=5" \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

### PowerShell

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/login" -ContentType "application/json" -Body '{"email":"soutenance.citizen1@ecotrack.local","password":"<demo-password>"}'
$token = $login.accessToken
$containerResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/containers?q=SOUT-C-002&page=1&pageSize=1"
$containerId = $containerResponse.containers[0].id
$body = @{
  containerId = $containerId
  reportType = "container_full"
  description = "Signalement live soutenance : conteneur plein."
  latitude = "48.866120"
  longitude = "2.347900"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/citizen/reports" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body
```

## 5. Captures a produire

Stockage recommande plus tard :

```text
docs/soutenance/assets/screenshots/
```

Captures principales :

| Capture | Route / source |
| --- | --- |
| Application web home | `http://localhost:5173` ou app deployee |
| Citizen report form | `/app/citizen/report` |
| Citizen history/profile | `/app/citizen/profile` |
| Manager dashboard | `/app/dashboard` |
| Manager planning/tours | `/app/manager/planning`, `/app/manager/tours` |
| Agent tour details | `/app/agent/tour` |
| Admin users/roles | `/app/admin` |
| Mobile citizen/agent/manager | Expo app |
| CI/CD | GitHub Actions |
| Proof portal | `https://oussamaredd.github.io/EcoTrack/` |
| Coverage/tests | terminal ou report HTML |

Regles de capture :

- Capturer depuis l'app lancee avec la base seedee quand c'est possible.
- Eviter les captures partielles avec donnees vides.
- Garder les donnees demo discretes : ne pas afficher de labels internes type `MOCK_DEMO`.
- Si une capture est illustrative et non issue de l'app, la reserver aux annexes ou la presenter comme schema.

## 6. Demo live 4-5 minutes

Preparation avant de parler :

- Ouvrir `http://localhost:5173`.
- Ouvrir un terminal avec l'API prete.
- Garder les captures backup dans un dossier visible.
- Garder le proof portal ouvert dans un onglet.

Script cible :

1. 30 sec - Ouvrir EcoTrack et rappeler le scenario : du signalement a l'action terrain.
2. 60 sec - Citoyen : montrer le formulaire de signalement ou creer un signalement via UI/API.
3. 45 sec - API / database : montrer la reponse API ou le listing `GET /api/citizen-reports`.
4. 60 sec - Manager : montrer dashboard, signalements, KPI, alertes.
5. 60 sec - Agent : ouvrir la tournee live, montrer l'arret actif, valider une collecte si la session le permet.
6. 30 sec - Preuve finale : historique, KPI mis a jour, proof portal.

Phrase de transition :

"Je ne cherche pas a tout montrer. Je montre un parcours coherent et verifiable : creation, API, stockage, pilotage manager, action agent, trace."

## 7. Plan de secours

Si le login UI ne fonctionne pas :

- utiliser les preuves API avec `/api/login`,
- montrer les captures deja preparees,
- expliquer que le seed alimente la base et que la session navigateur depend de la configuration Supabase de l'environnement,
- continuer avec le proof portal et les captures dashboard.

Si la base locale ne repond pas :

- ne pas improviser des chiffres,
- utiliser les captures pre-generees depuis une execution seedee,
- montrer les fichiers `DEMO_DATA_PLAN.md`, seed soutenance et storyboard comme preuves de preparation.

Si le mobile ne se lance pas :

- utiliser les screenshots Expo captures avant la soutenance,
- presenter le mobile comme experience terrain connectee a la meme API,
- basculer sur les routes web agent/citizen/manager.

## 8. Checklist avant generation du PPTX

- [ ] `ALLOW_SOUTENANCE_SEED=true npm run seed:soutenance` execute sur une base demo.
- [ ] Captures web prises depuis des donnees non vides.
- [ ] Captures mobile prises depuis Expo si disponible.
- [ ] Captures API endpoint mises en annexe.
- [ ] Captures CI/CD et coverage disponibles.
- [ ] Proof portal capture.
- [ ] Storyboard valide.
- [ ] Aucun chiffre presente comme production si issu du seed.
