import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inArray } from 'drizzle-orm';
import dotenv from 'dotenv';

import { createDatabaseInstance } from '../client.js';
import {
  alertEvents,
  anomalyReports,
  anomalyTypes,
  auditLogs,
  challengeParticipations,
  challenges,
  citizenReports,
  collectionEvents,
  containerTypes,
  containers,
  gamificationProfiles,
  ingestionEvents,
  measurementRollups10m,
  measurements,
  notificationDeliveries,
  notificationDevices,
  notificationRecipients,
  notifications,
  reportExports,
  roles,
  sensorDevices,
  tickets,
  tourRoutes,
  tourStops,
  tours,
  userRoles,
  users,
  validatedEventDeliveries,
  validatedMeasurementEvents,
  zoneAggregates10m,
  zoneCurrentState,
  zones,
} from '../schema/index.js';

type DemoRoleName = 'citizen' | 'agent' | 'manager' | 'admin';

type DemoUserSeed = {
  key: string;
  email: string;
  displayName: string;
  role: DemoRoleName;
  zoneCode?: string;
};

type DemoZoneSeed = {
  code: string;
  name: string;
  description: string;
  depotLabel: string;
  depotLatitude: string;
  depotLongitude: string;
};

type DemoContainerSeed = {
  code: string;
  label: string;
  zoneCode: string;
  typeCode: string;
  fillLevelPercent: number;
  fillRatePerHour: number;
  latitude: string;
  longitude: string;
};

type DemoTourSeed = {
  key: string;
  name: string;
  status: 'planned' | 'in_progress' | 'completed';
  zoneCode: string;
  assignedAgentEmail: string;
  scheduledOffsetMinutes: number;
  startedOffsetMinutes?: number;
  completedOffsetMinutes?: number;
  containerCodes: string[];
  stopStatuses: Array<'pending' | 'active' | 'completed'>;
};

type DemoTourContext = DemoTourSeed & {
  id: string;
  zoneId: string;
  assignedAgentId: string;
};

type DemoContainerContext = {
  id: string;
  code: string;
  label: string;
  zoneId: string;
  zoneCode: string;
  typeCode: string;
  fillLevelPercent: number;
  fillRatePerHour: number;
  latitude: string;
  longitude: string;
};

type DemoDateContext = {
  now: Date;
  todayStart: Date;
  dayKey: string;
  windowStart: Date;
  windowEnd: Date;
};

type RouteGeometryLineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

type SoutenanceDatabaseTarget = {
  url: string;
  source: 'SOUTENANCE_DATABASE_URL' | 'DATABASE_POOLER_URL';
  host: string;
  port: string;
  database: string;
  nodeEnv: string;
  allowSeed: boolean;
};

const DEMO_BATCH_PREFIX = 'soutenance-demo';
const SOUTENANCE_SEED_FLAG = 'ALLOW_SOUTENANCE_SEED';
const SOUTENANCE_DEMO_AUTH_HASH_ENV = 'SOUTENANCE_DEMO_AUTH_HASH';
const DEMO_TELEMETRY_DAY_KEY = '20260629';
const DEMO_TELEMETRY_WINDOW_START = new Date('2026-06-29T08:00:00.000Z');
const AVERAGE_ROUTE_SPEED_KMH = 24;
const STOP_SERVICE_DURATION_MINUTES = 4;
const EARTH_RADIUS_KM = 6371;
const DEMO_ROLE_NAMES: DemoRoleName[] = ['citizen', 'agent', 'manager', 'admin'];
const SUPABASE_POOLER_HOST_SUFFIX = 'pooler.supabase.com';

const DEMO_CONTAINER_TYPE_SEEDS = [
  {
    code: 'SOUT-TYPE-GLASS',
    label: 'Glass',
    wasteStream: 'glass',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 70,
    defaultCriticalAlertPercent: 90,
    colorCode: '#457B9D',
  },
  {
    code: 'SOUT-TYPE-RECYCLABLES',
    label: 'Recyclables',
    wasteStream: 'recyclable',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 75,
    defaultCriticalAlertPercent: 90,
    colorCode: '#2A9D8F',
  },
  {
    code: 'SOUT-TYPE-TEXTILE',
    label: 'Textile',
    wasteStream: 'textile',
    nominalCapacityLiters: 800,
    defaultFillAlertPercent: 70,
    defaultCriticalAlertPercent: 90,
    colorCode: '#C77D3B',
  },
  {
    code: 'SOUT-TYPE-MIXED',
    label: 'General Mixed Waste',
    wasteStream: 'mixed',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 80,
    defaultCriticalAlertPercent: 95,
    colorCode: '#4F5D75',
  },
];

const DEMO_CHALLENGE_SEEDS = [
  {
    code: 'SOUT-CHL-NEIGHBORHOOD-03',
    title: 'Neighborhood Reporter Sprint',
    description: 'Submit 3 validated neighborhood reports this month.',
    targetValue: 3,
    rewardPoints: 75,
    status: 'active',
  },
  {
    code: 'SOUT-CHL-SMART-ROUTE-05',
    title: 'Smart Route Support',
    description: 'Report 5 containers before peak overflow windows.',
    targetValue: 5,
    rewardPoints: 120,
    status: 'active',
  },
];

const DEMO_ANOMALY_TYPE_SEEDS = [
  {
    code: 'SOUT-ANOM-BLOCKED-ACCESS',
    label: 'Blocked access',
    description: 'Container cannot be reached due to blocked road or parked vehicles.',
  },
  {
    code: 'SOUT-ANOM-DAMAGED-CONTAINER',
    label: 'Damaged container',
    description: 'Container or lid appears damaged and requires intervention.',
  },
  {
    code: 'SOUT-ANOM-SAFETY-RISK',
    label: 'Safety risk',
    description: 'Safety hazard encountered during collection operation.',
  },
];

const DEMO_ZONES: DemoZoneSeed[] = [
  {
    code: 'SOUT-ZONE-01',
    name: 'Soutenance - Centre Nord',
    description: 'Zone demo pour les signalements denses et les conteneurs critiques.',
    depotLabel: 'Depot Soutenance Centre Nord',
    depotLatitude: '48.866120',
    depotLongitude: '2.347900',
  },
  {
    code: 'SOUT-ZONE-02',
    name: 'Soutenance - Rive Gauche',
    description: 'Zone demo pour le suivi manager des signalements citoyens.',
    depotLabel: 'Depot Soutenance Rive Gauche',
    depotLatitude: '48.846210',
    depotLongitude: '2.345120',
  },
  {
    code: 'SOUT-ZONE-03',
    name: 'Soutenance - Canal',
    description: 'Zone demo pour les tournees agent et anomalies terrain.',
    depotLabel: 'Depot Soutenance Canal',
    depotLatitude: '48.875340',
    depotLongitude: '2.365010',
  },
  {
    code: 'SOUT-ZONE-04',
    name: 'Soutenance - Est',
    description: 'Zone demo pour les niveaux de remplissage intermediaires.',
    depotLabel: 'Depot Soutenance Est',
    depotLatitude: '48.856440',
    depotLongitude: '2.390500',
  },
  {
    code: 'SOUT-ZONE-05',
    name: 'Soutenance - Ouest',
    description: 'Zone demo pour les indicateurs de resolution.',
    depotLabel: 'Depot Soutenance Ouest',
    depotLatitude: '48.863710',
    depotLongitude: '2.312400',
  },
  {
    code: 'SOUT-ZONE-06',
    name: 'Soutenance - Sud',
    description: 'Zone demo pour les collectes validees et alertes recentes.',
    depotLabel: 'Depot Soutenance Sud',
    depotLatitude: '48.833110',
    depotLongitude: '2.357800',
  },
];

const DEMO_USERS: DemoUserSeed[] = [
  {
    key: 'citizen-1',
    email: 'soutenance.citizen1@ecotrack.local',
    displayName: 'Soutenance Citizen Amina',
    role: 'citizen',
    zoneCode: 'SOUT-ZONE-01',
  },
  {
    key: 'citizen-2',
    email: 'soutenance.citizen2@ecotrack.local',
    displayName: 'Soutenance Citizen Karim',
    role: 'citizen',
    zoneCode: 'SOUT-ZONE-02',
  },
  {
    key: 'citizen-3',
    email: 'soutenance.citizen3@ecotrack.local',
    displayName: 'Soutenance Citizen Lina',
    role: 'citizen',
    zoneCode: 'SOUT-ZONE-03',
  },
  {
    key: 'citizen-4',
    email: 'soutenance.citizen4@ecotrack.local',
    displayName: 'Soutenance Citizen Nadir',
    role: 'citizen',
    zoneCode: 'SOUT-ZONE-04',
  },
  {
    key: 'agent-1',
    email: 'soutenance.agent1@ecotrack.local',
    displayName: 'Soutenance Agent Sarah',
    role: 'agent',
    zoneCode: 'SOUT-ZONE-01',
  },
  {
    key: 'agent-2',
    email: 'soutenance.agent2@ecotrack.local',
    displayName: 'Soutenance Agent Youssef',
    role: 'agent',
    zoneCode: 'SOUT-ZONE-02',
  },
  {
    key: 'agent-3',
    email: 'soutenance.agent3@ecotrack.local',
    displayName: 'Soutenance Agent Mei',
    role: 'agent',
    zoneCode: 'SOUT-ZONE-03',
  },
  {
    key: 'manager-1',
    email: 'soutenance.manager1@ecotrack.local',
    displayName: 'Soutenance Manager Claire',
    role: 'manager',
    zoneCode: 'SOUT-ZONE-01',
  },
  {
    key: 'manager-2',
    email: 'soutenance.manager2@ecotrack.local',
    displayName: 'Soutenance Manager Mehdi',
    role: 'manager',
    zoneCode: 'SOUT-ZONE-04',
  },
  {
    key: 'admin',
    email: 'soutenance.admin@ecotrack.local',
    displayName: 'Soutenance Admin Nora',
    role: 'admin',
  },
];

const FILL_LEVELS_BY_ZONE = [
  [96, 88, 78, 57, 31],
  [93, 82, 69, 44, 22],
  [91, 84, 76, 61, 37],
  [87, 72, 66, 49, 18],
  [95, 80, 63, 41, 28],
  [89, 74, 58, 36, 12],
] as const;

const TYPE_CODES_BY_STOP = [
  'SOUT-TYPE-RECYCLABLES',
  'SOUT-TYPE-MIXED',
  'SOUT-TYPE-GLASS',
  'SOUT-TYPE-TEXTILE',
  'SOUT-TYPE-RECYCLABLES',
] as const;

const DEMO_TOURS: DemoTourSeed[] = [
  {
    key: 'live-centre-nord',
    name: 'Soutenance - Tournee Centre Nord live',
    status: 'in_progress',
    zoneCode: 'SOUT-ZONE-01',
    assignedAgentEmail: 'soutenance.agent1@ecotrack.local',
    scheduledOffsetMinutes: -90,
    startedOffsetMinutes: -75,
    containerCodes: ['SOUT-C-001', 'SOUT-C-002', 'SOUT-C-003', 'SOUT-C-004'],
    stopStatuses: ['completed', 'active', 'pending', 'pending'],
  },
  {
    key: 'rive-gauche-planned',
    name: 'Soutenance - Tournee Rive Gauche planifiee',
    status: 'planned',
    zoneCode: 'SOUT-ZONE-02',
    assignedAgentEmail: 'soutenance.agent2@ecotrack.local',
    scheduledOffsetMinutes: 90,
    containerCodes: ['SOUT-C-006', 'SOUT-C-007', 'SOUT-C-008', 'SOUT-C-009'],
    stopStatuses: ['pending', 'pending', 'pending', 'pending'],
  },
  {
    key: 'canal-planned',
    name: 'Soutenance - Tournee Canal planifiee',
    status: 'planned',
    zoneCode: 'SOUT-ZONE-03',
    assignedAgentEmail: 'soutenance.agent3@ecotrack.local',
    scheduledOffsetMinutes: 150,
    containerCodes: ['SOUT-C-011', 'SOUT-C-012', 'SOUT-C-013'],
    stopStatuses: ['pending', 'pending', 'pending'],
  },
  {
    key: 'centre-completed-yesterday',
    name: 'Soutenance - Tournee Centre Nord terminee',
    status: 'completed',
    zoneCode: 'SOUT-ZONE-01',
    assignedAgentEmail: 'soutenance.agent1@ecotrack.local',
    scheduledOffsetMinutes: -1500,
    startedOffsetMinutes: -1480,
    completedOffsetMinutes: -1380,
    containerCodes: ['SOUT-C-005', 'SOUT-C-001', 'SOUT-C-003'],
    stopStatuses: ['completed', 'completed', 'completed'],
  },
  {
    key: 'est-planned-tomorrow',
    name: 'Soutenance - Tournee Est demain',
    status: 'planned',
    zoneCode: 'SOUT-ZONE-04',
    assignedAgentEmail: 'soutenance.agent2@ecotrack.local',
    scheduledOffsetMinutes: 1440,
    containerCodes: ['SOUT-C-016', 'SOUT-C-017', 'SOUT-C-018', 'SOUT-C-019'],
    stopStatuses: ['pending', 'pending', 'pending', 'pending'],
  },
  {
    key: 'sud-completed',
    name: 'Soutenance - Tournee Sud controle qualite',
    status: 'completed',
    zoneCode: 'SOUT-ZONE-06',
    assignedAgentEmail: 'soutenance.agent3@ecotrack.local',
    scheduledOffsetMinutes: -2940,
    startedOffsetMinutes: -2920,
    completedOffsetMinutes: -2810,
    containerCodes: ['SOUT-C-026', 'SOUT-C-027', 'SOUT-C-028', 'SOUT-C-029'],
    stopStatuses: ['completed', 'completed', 'completed', 'completed'],
  },
];

const deterministicUuid = (label: string) => {
  const hex = createHash('sha1')
    .update(`ecotrack-soutenance:${label}`)
    .digest('hex')
    .slice(0, 32)
    .split('');

  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16);

  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(
    16,
    20,
  )}-${value.slice(20)}`;
};

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

const buildDateContext = (): DemoDateContext => {
  const now = new Date();
  now.setSeconds(0, 0);

  const todayStart = new Date(now);
  todayStart.setHours(8, 0, 0, 0);

  const windowStart = DEMO_TELEMETRY_WINDOW_START;

  return {
    now,
    todayStart,
    dayKey: DEMO_TELEMETRY_DAY_KEY,
    windowStart,
    windowEnd: addMinutes(windowStart, 10),
  };
};

const requireMapValue = (map: Map<string, string>, key: string, label: string) => {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label}: ${key}`);
  }

  return value;
};

const parseCoordinate = (value: string) => Number.parseFloat(value);

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

const buildRoute = (
  zone: DemoZoneSeed,
  tourContainers: DemoContainerContext[],
): { geometry: RouteGeometryLineString; distanceMeters: number; durationMinutes: number } => {
  const points = [
    {
      latitude: parseCoordinate(zone.depotLatitude),
      longitude: parseCoordinate(zone.depotLongitude),
    },
    ...tourContainers.map((container) => ({
      latitude: parseCoordinate(container.latitude),
      longitude: parseCoordinate(container.longitude),
    })),
  ];

  let totalDistanceKm = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalDistanceKm += haversineDistanceKm(points[index - 1], points[index]);
  }

  const distanceMeters = Math.round(totalDistanceKm * 1000);
  const durationMinutes = Math.max(
    STOP_SERVICE_DURATION_MINUTES,
    Math.round((totalDistanceKm / AVERAGE_ROUTE_SPEED_KMH) * 60 + tourContainers.length * STOP_SERVICE_DURATION_MINUTES),
  );

  return {
    geometry: {
      type: 'LineString',
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    },
    distanceMeters,
    durationMinutes,
  };
};

const resolveContainerStatus = (fillLevelPercent: number) =>
  fillLevelPercent >= 80 ? 'attention_required' : 'available';

const buildDemoContainers = (): DemoContainerSeed[] =>
  DEMO_ZONES.flatMap((zone, zoneIndex) =>
    FILL_LEVELS_BY_ZONE[zoneIndex].map((fillLevelPercent, stopIndex) => {
      const containerNumber = zoneIndex * 5 + stopIndex + 1;
      const typeCode = TYPE_CODES_BY_STOP[stopIndex];
      const latitude = parseCoordinate(zone.depotLatitude) + (stopIndex - 2) * 0.0012 + zoneIndex * 0.00018;
      const longitude = parseCoordinate(zone.depotLongitude) + (2 - stopIndex) * 0.0014 - zoneIndex * 0.00021;

      return {
        code: `SOUT-C-${String(containerNumber).padStart(3, '0')}`,
        label: `Soutenance ${zone.name.replace('Soutenance - ', '')} - Point ${stopIndex + 1}`,
        zoneCode: zone.code,
        typeCode,
        fillLevelPercent,
        fillRatePerHour: 4 + ((containerNumber * 3) % 9),
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      };
    }),
  );

const buildReportDescription = (index: number) => {
  const reportTypes = [
    '[container_full] Conteneur plein avec depot au sol signale par un riverain.',
    '[damaged_container] Couvercle endommage et collecte difficile.',
    '[overflow] Debordement visible pres du point de tri.',
    '[access_blocked] Acces partiellement bloque pour le passage agent.',
  ];

  return reportTypes[index % reportTypes.length];
};

const buildAlertPayload = (source: string, values: Record<string, unknown>) => ({
  source,
  demoDataset: 'soutenance',
  ...values,
});

const loadSoutenanceEnvIfNeeded = () => {
  if (process.env.SOUTENANCE_DATABASE_URL || process.env.DATABASE_POOLER_URL) {
    return;
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(moduleDir, '..', '..', '.env'),
    path.resolve(moduleDir, '..', '..', '..', '.env'),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }

    if (process.env.SOUTENANCE_DATABASE_URL || process.env.DATABASE_POOLER_URL) {
      return;
    }
  }
};

const resolveSoutenanceDatabaseTarget = (): SoutenanceDatabaseTarget => {
  loadSoutenanceEnvIfNeeded();

  const rawUrl = process.env.SOUTENANCE_DATABASE_URL?.trim() || process.env.DATABASE_POOLER_URL?.trim();
  const source = process.env.SOUTENANCE_DATABASE_URL?.trim() ? 'SOUTENANCE_DATABASE_URL' : 'DATABASE_POOLER_URL';

  if (!rawUrl) {
    throw new Error('Set SOUTENANCE_DATABASE_URL or DATABASE_POOLER_URL before running seed:soutenance.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    throw new Error(
      `${source} must be a valid Postgres connection string. ${error instanceof Error ? error.message : ''}`.trim(),
    );
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error(`${source} must use a Postgres connection string.`);
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (!host.includes(SUPABASE_POOLER_HOST_SUFFIX)) {
    throw new Error(
      `${source} must point at a Supabase pooler host containing ${SUPABASE_POOLER_HOST_SUFFIX}; refusing ${parsedUrl.hostname}.`,
    );
  }

  const port = parsedUrl.port || '5432';
  if (port !== '5432') {
    throw new Error(`${source} must use Supabase pooler Session mode on port 5432; refusing port ${port}.`);
  }

  return {
    url: parsedUrl.toString(),
    source,
    host: parsedUrl.hostname,
    port,
    database: parsedUrl.pathname.replace(/^\//, '') || '(default)',
    nodeEnv: process.env.NODE_ENV || '(unset)',
    allowSeed: process.env[SOUTENANCE_SEED_FLAG] === 'true',
  };
};

const logSoutenanceDatabaseTarget = (target: SoutenanceDatabaseTarget) => {
  console.info(
    `[seed:soutenance] Database target source=${target.source} host=${target.host} port=${target.port} database=${target.database} NODE_ENV=${target.nodeEnv} ${SOUTENANCE_SEED_FLAG}=${target.allowSeed ? 'true' : 'false'}`,
  );
};

const resolveSoutenanceDemoAuthHash = () => {
  const authHash = process.env[SOUTENANCE_DEMO_AUTH_HASH_ENV]?.trim();
  if (!authHash) {
    throw new Error(`Set ${SOUTENANCE_DEMO_AUTH_HASH_ENV} to a dev-only bcrypt auth hash before running seed:soutenance.`);
  }

  return authHash;
};

export async function seedSoutenanceDemoDatabase() {
  const databaseTarget = resolveSoutenanceDatabaseTarget();
  logSoutenanceDatabaseTarget(databaseTarget);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run soutenance seed in production.');
  }

  if (process.env[SOUTENANCE_SEED_FLAG] !== 'true') {
    throw new Error(`Refusing to run soutenance seed without ${SOUTENANCE_SEED_FLAG}=true`);
  }

  const demoAuthHash = resolveSoutenanceDemoAuthHash();
  const { db, dispose } = createDatabaseInstance({ url: databaseTarget.url, maxConnections: 1 });
  const dates = buildDateContext();
  const demoContainers = buildDemoContainers();

  try {
    await db.transaction(async (tx) => {
      const roleRows = await tx
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(inArray(roles.name, DEMO_ROLE_NAMES));
      const roleIds = new Map(roleRows.map((role) => [role.name, role.id]));
      for (const roleName of DEMO_ROLE_NAMES) {
        requireMapValue(roleIds, roleName, 'existing application role');
      }

      for (const zone of DEMO_ZONES) {
        await tx
          .insert(zones)
          .values({
            id: deterministicUuid(`zone:${zone.code}`),
            name: zone.name,
            code: zone.code,
            description: zone.description,
            depotLabel: zone.depotLabel,
            depotLatitude: zone.depotLatitude,
            depotLongitude: zone.depotLongitude,
            isActive: true,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: zones.code,
            set: {
              name: zone.name,
              description: zone.description,
              depotLabel: zone.depotLabel,
              depotLatitude: zone.depotLatitude,
              depotLongitude: zone.depotLongitude,
              isActive: true,
              updatedAt: dates.now,
            },
          });
      }

      const zoneRows = await tx
        .select({ id: zones.id, code: zones.code })
        .from(zones)
        .where(inArray(zones.code, DEMO_ZONES.map((zone) => zone.code)));
      const zoneIds = new Map(zoneRows.map((zone) => [zone.code, zone.id]));

      for (const user of DEMO_USERS) {
        const zoneId = user.zoneCode ? requireMapValue(zoneIds, user.zoneCode, 'demo zone') : null;

        await tx
          .insert(users)
          .values({
            id: deterministicUuid(`user:${user.key}`),
            email: user.email,
            displayName: user.displayName,
            authProvider: 'local',
            passwordHash: demoAuthHash,
            googleId: null,
            role: user.role,
            zoneId,
            isActive: true,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              displayName: user.displayName,
              authProvider: 'local',
              passwordHash: demoAuthHash,
              googleId: null,
              role: user.role,
              zoneId,
              isActive: true,
              updatedAt: dates.now,
            },
          });
      }

      const userRows = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.email, DEMO_USERS.map((user) => user.email)));
      const userIds = new Map(userRows.map((user) => [user.email, user.id]));

      for (const user of DEMO_USERS) {
        const userId = requireMapValue(userIds, user.email, 'demo user');
        const roleId = requireMapValue(roleIds, user.role, 'role');

        await tx
          .insert(userRoles)
          .values({
            userId,
            roleId,
            createdAt: dates.now,
          })
          .onConflictDoNothing();
      }

      for (const type of DEMO_CONTAINER_TYPE_SEEDS) {
        await tx
          .insert(containerTypes)
          .values({
            id: deterministicUuid(`container-type:${type.code}`),
            code: type.code,
            label: type.label,
            wasteStream: type.wasteStream,
            nominalCapacityLiters: type.nominalCapacityLiters,
            defaultFillAlertPercent: type.defaultFillAlertPercent,
            defaultCriticalAlertPercent: type.defaultCriticalAlertPercent,
            colorCode: type.colorCode,
            isActive: true,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoNothing();
      }

      const typeRows = await tx
        .select({ id: containerTypes.id, code: containerTypes.code })
        .from(containerTypes)
        .where(inArray(containerTypes.code, [...TYPE_CODES_BY_STOP]));
      const typeIds = new Map(typeRows.map((type) => [type.code, type.id]));

      for (const container of demoContainers) {
        const zoneId = requireMapValue(zoneIds, container.zoneCode, 'demo zone');
        const containerTypeId = requireMapValue(typeIds, container.typeCode, 'container type');
        const lastMeasurementAt = addMinutes(dates.now, -((Number(container.code.slice(-3)) % 30) + 3));

        await tx
          .insert(containers)
          .values({
            id: deterministicUuid(`container:${container.code}`),
            code: container.code,
            label: container.label,
            status: resolveContainerStatus(container.fillLevelPercent),
            fillLevelPercent: container.fillLevelPercent,
            fillRatePerHour: container.fillRatePerHour,
            lastMeasurementAt,
            lastCollectedAt: container.fillLevelPercent <= 15 ? addMinutes(dates.now, -180) : null,
            latitude: container.latitude,
            longitude: container.longitude,
            containerTypeId,
            zoneId,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: containers.code,
            set: {
              label: container.label,
              status: resolveContainerStatus(container.fillLevelPercent),
              fillLevelPercent: container.fillLevelPercent,
              fillRatePerHour: container.fillRatePerHour,
              lastMeasurementAt,
              lastCollectedAt: container.fillLevelPercent <= 15 ? addMinutes(dates.now, -180) : null,
              latitude: container.latitude,
              longitude: container.longitude,
              containerTypeId,
              zoneId,
              updatedAt: dates.now,
            },
          });
      }

      const containerRows = await tx
        .select({
          id: containers.id,
          code: containers.code,
          label: containers.label,
          zoneId: containers.zoneId,
          latitude: containers.latitude,
          longitude: containers.longitude,
          fillLevelPercent: containers.fillLevelPercent,
          fillRatePerHour: containers.fillRatePerHour,
        })
        .from(containers)
        .where(inArray(containers.code, demoContainers.map((container) => container.code)));

      const containerContexts = new Map<string, DemoContainerContext>();
      for (const container of demoContainers) {
        const row = containerRows.find((candidate) => candidate.code === container.code);
        if (!row?.zoneId) {
          throw new Error(`Missing seeded container row: ${container.code}`);
        }

        containerContexts.set(container.code, {
          id: row.id,
          code: row.code,
          label: row.label,
          zoneId: row.zoneId,
          zoneCode: container.zoneCode,
          typeCode: container.typeCode,
          fillLevelPercent: row.fillLevelPercent,
          fillRatePerHour: row.fillRatePerHour,
          latitude: row.latitude,
          longitude: row.longitude,
        });
      }

      for (const container of demoContainers) {
        const context = requireMapValue(
          new Map([...containerContexts].map(([code, value]) => [code, value.id])),
          container.code,
          'demo container',
        );
        const deviceUid = `SOUT-SENSOR-${container.code.slice(-3)}`;
        await tx
          .insert(sensorDevices)
          .values({
            id: deterministicUuid(`sensor:${deviceUid}`),
            containerId: context,
            deviceUid,
            hardwareModel: 'EcoTrack demo fill sensor',
            firmwareVersion: 'demo-1.0.0',
            installStatus: 'active',
            batteryPercent: 67 + (Number(container.code.slice(-3)) % 28),
            lastSeenAt: addMinutes(dates.now, -4),
            installedAt: addMinutes(dates.todayStart, -60 * 24 * 20),
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: sensorDevices.deviceUid,
            set: {
              containerId: context,
              hardwareModel: 'EcoTrack demo fill sensor',
              firmwareVersion: 'demo-1.0.0',
              installStatus: 'active',
              batteryPercent: 67 + (Number(container.code.slice(-3)) % 28),
              lastSeenAt: addMinutes(dates.now, -4),
              updatedAt: dates.now,
            },
          });
      }

      const sensorRows = await tx
        .select({ id: sensorDevices.id, deviceUid: sensorDevices.deviceUid })
        .from(sensorDevices)
        .where(inArray(sensorDevices.deviceUid, demoContainers.map((container) => `SOUT-SENSOR-${container.code.slice(-3)}`)));
      const sensorIds = new Map(sensorRows.map((sensor) => [sensor.deviceUid, sensor.id]));

      for (const [index, container] of demoContainers.entries()) {
        const containerContext = containerContexts.get(container.code);
        if (!containerContext) {
          throw new Error(`Missing container context: ${container.code}`);
        }

        const deviceUid = `SOUT-SENSOR-${container.code.slice(-3)}`;
        const sensorId = requireMapValue(sensorIds, deviceUid, 'demo sensor');
        const measuredAt = addMinutes(dates.windowStart, -(index % 6) * 10);
        const batchId = deterministicUuid(`telemetry-batch:${dates.dayKey}`);
        const ingestionId = deterministicUuid(`ingestion:${dates.dayKey}:${deviceUid}`);
        const validatedEventId = deterministicUuid(`validated:${dates.dayKey}:${deviceUid}`);
        const measurementId = 9_200_000 + Number(dates.dayKey.slice(4)) * 100 + index + 1;
        const idempotencyKey = `${DEMO_BATCH_PREFIX}:${dates.dayKey}:${deviceUid}`;

        await tx
          .insert(ingestionEvents)
          .values({
            id: ingestionId,
            batchId,
            deviceUid,
            sensorDeviceId: sensorId,
            containerId: containerContext.id,
            routingKey: `iot.measurements.${containerContext.zoneCode}`,
            shardId: index % 4,
            idempotencyKey,
            measuredAt,
            fillLevelPercent: containerContext.fillLevelPercent,
            temperatureC: 17 + (index % 7),
            batteryPercent: 67 + (index % 28),
            signalStrength: 68 + (index % 25),
            measurementQuality: 'valid',
            processingStatus: 'processed',
            attemptCount: 1,
            nextAttemptAt: dates.now,
            processingStartedAt: addMinutes(measuredAt, 1),
            processedAt: addMinutes(measuredAt, 2),
            processingLatencyMs: 420 + index * 7,
            rawPayload: {
              source: 'iot-ingestion-api',
              schemaVersion: 'v1',
              batchId,
              producer: {
                name: DEMO_BATCH_PREFIX,
                transactionId: deterministicUuid(`producer:${dates.dayKey}:${deviceUid}`),
              },
              measurement: {
                sensorDeviceId: sensorId,
                containerId: containerContext.id,
                deviceUid,
                measuredAt: measuredAt.toISOString(),
                fillLevelPercent: containerContext.fillLevelPercent,
                temperatureC: 17 + (index % 7),
                batteryPercent: 67 + (index % 28),
                signalStrength: 68 + (index % 25),
                measurementQuality: 'valid',
                idempotencyKey,
              },
            },
            producerName: DEMO_BATCH_PREFIX,
            producerTransactionId: deterministicUuid(`producer:${dates.dayKey}:${deviceUid}`),
            receivedAt: addMinutes(measuredAt, 1),
            createdAt: addMinutes(measuredAt, 1),
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: ingestionEvents.id,
            set: {
              fillLevelPercent: containerContext.fillLevelPercent,
              processingStatus: 'processed',
              processedAt: addMinutes(measuredAt, 2),
              processingLatencyMs: 420 + index * 7,
              updatedAt: dates.now,
            },
          });

        await tx
          .insert(validatedMeasurementEvents)
          .values({
            id: validatedEventId,
            sourceEventId: ingestionId,
            deviceUid,
            sensorDeviceId: sensorId,
            containerId: containerContext.id,
            measuredAt,
            fillLevelPercent: containerContext.fillLevelPercent,
            temperatureC: 17 + (index % 7),
            batteryPercent: 67 + (index % 28),
            signalStrength: 68 + (index % 25),
            measurementQuality: 'valid',
            warningThreshold: 80,
            criticalThreshold: 95,
            validationSummary: {
              valid: true,
              rules: ['range_check', 'device_registered'],
            },
            normalizedPayload: {
              sourceEventId: ingestionId,
              eventName: 'iot.measurement.validated',
              schemaVersion: 'v1',
              routingKey: `iot.measurements.${containerContext.zoneCode}`,
              shardId: index % 4,
              producerName: DEMO_BATCH_PREFIX,
              producerTransactionId: deterministicUuid(`producer:${dates.dayKey}:${deviceUid}`),
              deviceUid,
              sensorDeviceId: sensorId,
              containerId: containerContext.id,
              measuredAt: measuredAt.toISOString(),
              fillLevelPercent: containerContext.fillLevelPercent,
              temperatureC: 17 + (index % 7),
              batteryPercent: 67 + (index % 28),
              signalStrength: 68 + (index % 25),
              measurementQuality: 'valid',
              warningThreshold: 80,
              criticalThreshold: 95,
              receivedAt: addMinutes(measuredAt, 1).toISOString(),
              processedAt: addMinutes(measuredAt, 2).toISOString(),
            },
            routingKey: `iot.measurements.${containerContext.zoneCode}`,
            shardId: index % 4,
            schemaVersion: 'v1',
            producerName: DEMO_BATCH_PREFIX,
            producerTransactionId: deterministicUuid(`producer:${dates.dayKey}:${deviceUid}`),
            emittedAt: addMinutes(measuredAt, 3),
          })
          .onConflictDoUpdate({
            target: validatedMeasurementEvents.id,
            set: {
              fillLevelPercent: containerContext.fillLevelPercent,
              emittedAt: addMinutes(measuredAt, 3),
            },
          });

        await tx
          .insert(measurements)
          .values({
            id: measurementId,
            validatedEventId,
            sensorDeviceId: sensorId,
            containerId: containerContext.id,
            measuredAt,
            fillLevelPercent: containerContext.fillLevelPercent,
            temperatureC: 17 + (index % 7),
            batteryPercent: 67 + (index % 28),
            signalStrength: 68 + (index % 25),
            measurementQuality: 'valid',
            sourcePayload: {
              source: DEMO_BATCH_PREFIX,
              deviceUid,
              demoDayKey: dates.dayKey,
            },
            receivedAt: addMinutes(measuredAt, 1),
          })
          .onConflictDoUpdate({
            target: [measurements.validatedEventId, measurements.measuredAt],
            set: {
              fillLevelPercent: containerContext.fillLevelPercent,
              receivedAt: addMinutes(measuredAt, 1),
            },
          });

        await tx
          .insert(measurementRollups10m)
          .values({
            id: deterministicUuid(`rollup:${dates.dayKey}:${deviceUid}`),
            validatedEventId,
            deviceUid,
            sensorDeviceId: sensorId,
            containerId: containerContext.id,
            windowStart: dates.windowStart,
            windowEnd: dates.windowEnd,
            measurementCount: 1,
            averageFillLevelPercent: containerContext.fillLevelPercent,
            fillLevelDeltaPercent: Math.max(0, Math.min(11, containerContext.fillRatePerHour)),
            sensorHealthScore: 92 - (index % 12),
            schemaVersion: 'v1',
            sourcePayload: {
              validatedEventId,
              deviceUid,
              containerId: containerContext.id,
              windowStart: dates.windowStart.toISOString(),
              windowEnd: dates.windowEnd.toISOString(),
              measurementCount: 1,
              averageFillLevelPercent: containerContext.fillLevelPercent,
              fillLevelDeltaPercent: Math.max(0, Math.min(11, containerContext.fillRatePerHour)),
              sensorHealthScore: 92 - (index % 12),
              schemaVersion: 'v1',
            },
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: measurementRollups10m.id,
            set: {
              averageFillLevelPercent: containerContext.fillLevelPercent,
              fillLevelDeltaPercent: Math.max(0, Math.min(11, containerContext.fillRatePerHour)),
              sensorHealthScore: 92 - (index % 12),
              windowStart: dates.windowStart,
              windowEnd: dates.windowEnd,
              updatedAt: dates.now,
            },
          });

        await tx
          .insert(validatedEventDeliveries)
          .values({
            id: deterministicUuid(`validated-delivery:${dates.dayKey}:${deviceUid}`),
            consumerName: 'measurement_rollup_projection',
            validatedEventId,
            processingStatus: 'processed',
            attemptCount: 1,
            nextAttemptAt: dates.now,
            processingStartedAt: addMinutes(measuredAt, 3),
            processedAt: addMinutes(measuredAt, 4),
            eventName: 'iot.measurement.validated',
            routingKey: `iot.measurements.${containerContext.zoneCode}`,
            shardId: index % 4,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: validatedEventDeliveries.id,
            set: {
              processingStatus: 'processed',
              processedAt: addMinutes(measuredAt, 4),
              updatedAt: dates.now,
            },
          });
      }

      for (const zone of DEMO_ZONES) {
        const zoneId = requireMapValue(zoneIds, zone.code, 'demo zone');
        const zoneContainers = [...containerContexts.values()].filter((container) => container.zoneCode === zone.code);
        const fillLevels = zoneContainers.map((container) => container.fillLevelPercent);
        const measurementsCount = fillLevels.length;
        const averageFillLevelPercent = Math.round(
          fillLevels.reduce((total, value) => total + value, 0) / measurementsCount,
        );
        const minFillLevelPercent = Math.min(...fillLevels);
        const maxFillLevelPercent = Math.max(...fillLevels);
        const highFillCount = fillLevels.filter((value) => value >= 80).length;
        const aggregateId = deterministicUuid(`zone-aggregate:${dates.dayKey}:${zone.code}`);

        await tx
          .insert(zoneAggregates10m)
          .values({
            id: aggregateId,
            zoneId,
            windowStart: dates.windowStart,
            windowEnd: dates.windowEnd,
            measurementsCount,
            averageFillLevelPercent,
            minFillLevelPercent,
            maxFillLevelPercent,
            highFillCount,
            trendSlopePerHour: 3 + (highFillCount % 5),
            schemaVersion: 'v1',
            sourcePayload: {
              zoneId,
              windowStart: dates.windowStart.toISOString(),
              windowEnd: dates.windowEnd.toISOString(),
              measurementsCount,
              averageFillLevelPercent,
              minFillLevelPercent,
              maxFillLevelPercent,
              highFillCount,
              trendSlopePerHour: 3 + (highFillCount % 5),
              schemaVersion: 'v1',
            },
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: zoneAggregates10m.id,
            set: {
              measurementsCount,
              averageFillLevelPercent,
              minFillLevelPercent,
              maxFillLevelPercent,
              highFillCount,
              trendSlopePerHour: 3 + (highFillCount % 5),
              windowStart: dates.windowStart,
              windowEnd: dates.windowEnd,
              updatedAt: dates.now,
            },
          });

        await tx
          .insert(zoneCurrentState)
          .values({
            zoneId,
            latestAggregateId: aggregateId,
            windowStart: dates.windowStart,
            windowEnd: dates.windowEnd,
            measurementsCount,
            averageFillLevelPercent,
            minFillLevelPercent,
            maxFillLevelPercent,
            highFillCount,
            trendSlopePerHour: 3 + (highFillCount % 5),
            schemaVersion: 'v1',
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: zoneCurrentState.zoneId,
            set: {
              latestAggregateId: aggregateId,
              windowStart: dates.windowStart,
              windowEnd: dates.windowEnd,
              measurementsCount,
              averageFillLevelPercent,
              minFillLevelPercent,
              maxFillLevelPercent,
              highFillCount,
              trendSlopePerHour: 3 + (highFillCount % 5),
              updatedAt: dates.now,
            },
          });
      }

      const citizenEmails = DEMO_USERS.filter((user) => user.role === 'citizen').map((user) => user.email);
      const managerId = requireMapValue(userIds, 'soutenance.manager1@ecotrack.local', 'demo manager');
      const adminId = requireMapValue(userIds, 'soutenance.admin@ecotrack.local', 'demo admin');

      for (let index = 0; index < 24; index += 1) {
        const container = demoContainers[index % demoContainers.length];
        const context = containerContexts.get(container.code);
        if (!context) {
          throw new Error(`Missing report container: ${container.code}`);
        }

        const reporterEmail = citizenEmails[index % citizenEmails.length];
        const reporterUserId = requireMapValue(userIds, reporterEmail, 'demo citizen');
        const status = index % 4 === 0 ? 'resolved' : index % 3 === 0 ? 'in_progress' : 'new';
        const reportedAt = addMinutes(dates.todayStart, -1_200 + index * 45);
        const id = deterministicUuid(`citizen-report:${index + 1}`);

        await tx
          .insert(citizenReports)
          .values({
            id,
            containerId: context.id,
            containerCodeSnapshot: context.code,
            containerLabelSnapshot: context.label,
            reporterUserId,
            status,
            description: buildReportDescription(index),
            latitude: context.latitude,
            longitude: context.longitude,
            reportedAt,
            createdAt: reportedAt,
            updatedAt: addMinutes(reportedAt, status === 'resolved' ? 240 : 60),
          })
          .onConflictDoUpdate({
            target: citizenReports.id,
            set: {
              containerId: context.id,
              containerCodeSnapshot: context.code,
              containerLabelSnapshot: context.label,
              reporterUserId,
              status,
              description: buildReportDescription(index),
              latitude: context.latitude,
              longitude: context.longitude,
              reportedAt,
              updatedAt: addMinutes(reportedAt, status === 'resolved' ? 240 : 60),
            },
          });
      }

      for (const [index, user] of DEMO_USERS.filter((candidate) => candidate.role === 'citizen').entries()) {
        const userId = requireMapValue(userIds, user.email, 'demo citizen');
        await tx
          .insert(gamificationProfiles)
          .values({
            id: deterministicUuid(`gamification:${user.key}`),
            userId,
            points: 140 + index * 55,
            level: 2 + index,
            badges: ['first_report', index >= 1 ? 'neighborhood_helper' : 'demo_ready'].filter(Boolean),
            challengeProgress: {
              reportsSubmitted: 3 + index,
              resolvedReports: 1 + index,
              demoDataset: 'soutenance',
            },
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: gamificationProfiles.userId,
            set: {
              points: 140 + index * 55,
              level: 2 + index,
              badges: ['first_report', index >= 1 ? 'neighborhood_helper' : 'demo_ready'].filter(Boolean),
              challengeProgress: {
                reportsSubmitted: 3 + index,
                resolvedReports: 1 + index,
                demoDataset: 'soutenance',
              },
              updatedAt: dates.now,
            },
          });
      }

      for (const challenge of DEMO_CHALLENGE_SEEDS) {
        await tx
          .insert(challenges)
          .values({
            id: deterministicUuid(`challenge:${challenge.code}`),
            code: challenge.code,
            title: challenge.title,
            description: challenge.description,
            targetValue: challenge.targetValue,
            rewardPoints: challenge.rewardPoints,
            status: challenge.status,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoNothing();
      }

      const challengeRows = await tx
        .select({ id: challenges.id, code: challenges.code })
        .from(challenges)
        .where(inArray(challenges.code, ['SOUT-CHL-NEIGHBORHOOD-03', 'SOUT-CHL-SMART-ROUTE-05']));
      const challengeIds = new Map(challengeRows.map((challenge) => [challenge.code, challenge.id]));

      for (const [index, email] of citizenEmails.entries()) {
        const challengeCode = index % 2 === 0 ? 'SOUT-CHL-NEIGHBORHOOD-03' : 'SOUT-CHL-SMART-ROUTE-05';
        const challengeId = requireMapValue(challengeIds, challengeCode, 'challenge');
        const userId = requireMapValue(userIds, email, 'demo citizen');
        const participationId = deterministicUuid(`challenge-participation:${challengeCode}:${email}`);

        await tx
          .insert(challengeParticipations)
          .values({
            id: participationId,
            challengeId,
            userId,
            progress: 2 + index,
            status: index === 0 ? 'completed' : 'enrolled',
            rewardGrantedAt: index === 0 ? addMinutes(dates.now, -300) : null,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: challengeParticipations.id,
            set: {
              progress: 2 + index,
              status: index === 0 ? 'completed' : 'enrolled',
              rewardGrantedAt: index === 0 ? addMinutes(dates.now, -300) : null,
              updatedAt: dates.now,
            },
          });
      }

      for (let index = 0; index < 8; index += 1) {
        const requesterId = requireMapValue(userIds, citizenEmails[index % citizenEmails.length], 'demo citizen');
        const assigneeId = index < 4 ? managerId : adminId;
        const status = index % 4 === 0 ? 'completed' : index % 3 === 0 ? 'in_progress' : 'open';

        await tx
          .insert(tickets)
          .values({
            id: deterministicUuid(`support-ticket:${index + 1}`),
            title: `Soutenance support case ${index + 1}`,
            description: 'Ticket de support demo pour alimenter les KPI du dashboard legacy.',
            supportCategory: index % 2 === 0 ? 'operations' : 'account_help',
            status,
            priority: index % 3 === 0 ? 'high' : 'medium',
            requesterId,
            assigneeId,
            createdAt: addMinutes(dates.todayStart, -780 + index * 75),
            updatedAt: addMinutes(dates.todayStart, -700 + index * 75),
            closedAt: status === 'completed' ? addMinutes(dates.todayStart, -640 + index * 75) : null,
          })
          .onConflictDoUpdate({
            target: tickets.id,
            set: {
              status,
              priority: index % 3 === 0 ? 'high' : 'medium',
              assigneeId,
              updatedAt: addMinutes(dates.todayStart, -700 + index * 75),
              closedAt: status === 'completed' ? addMinutes(dates.todayStart, -640 + index * 75) : null,
            },
          });
      }

      const tourContexts: DemoTourContext[] = [];
      for (const tour of DEMO_TOURS) {
        const zoneId = requireMapValue(zoneIds, tour.zoneCode, 'demo zone');
        const assignedAgentId = requireMapValue(userIds, tour.assignedAgentEmail, 'demo agent');
        const tourId = deterministicUuid(`tour:${tour.key}`);
        tourContexts.push({ ...tour, id: tourId, zoneId, assignedAgentId });

        await tx
          .insert(tours)
          .values({
            id: tourId,
            name: tour.name,
            status: tour.status,
            scheduledFor: addMinutes(dates.now, tour.scheduledOffsetMinutes),
            zoneId,
            assignedAgentId,
            startedAt: tour.startedOffsetMinutes == null ? null : addMinutes(dates.now, tour.startedOffsetMinutes),
            completedAt: tour.completedOffsetMinutes == null ? null : addMinutes(dates.now, tour.completedOffsetMinutes),
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: tours.id,
            set: {
              name: tour.name,
              status: tour.status,
              scheduledFor: addMinutes(dates.now, tour.scheduledOffsetMinutes),
              zoneId,
              assignedAgentId,
              startedAt: tour.startedOffsetMinutes == null ? null : addMinutes(dates.now, tour.startedOffsetMinutes),
              completedAt: tour.completedOffsetMinutes == null ? null : addMinutes(dates.now, tour.completedOffsetMinutes),
              updatedAt: dates.now,
            },
          });

        const tourContainerContexts = tour.containerCodes.map((code) => {
          const context = containerContexts.get(code);
          if (!context) {
            throw new Error(`Missing tour container: ${code}`);
          }

          return context;
        });

        for (const [stopIndex, container] of tourContainerContexts.entries()) {
          const stopStatus = tour.stopStatuses[stopIndex] ?? 'pending';
          const completedAt =
            stopStatus === 'completed'
              ? addMinutes(dates.now, (tour.startedOffsetMinutes ?? -120) + 20 + stopIndex * 18)
              : null;

          await tx
            .insert(tourStops)
            .values({
              id: deterministicUuid(`tour-stop:${tour.key}:${stopIndex + 1}`),
              tourId,
              containerId: container.id,
              stopOrder: stopIndex + 1,
              status: stopStatus,
              eta: addMinutes(dates.now, tour.scheduledOffsetMinutes + 15 + stopIndex * 18),
              completedAt,
              createdAt: dates.now,
              updatedAt: dates.now,
            })
            .onConflictDoUpdate({
              target: tourStops.id,
              set: {
                tourId,
                containerId: container.id,
                stopOrder: stopIndex + 1,
                status: stopStatus,
                eta: addMinutes(dates.now, tour.scheduledOffsetMinutes + 15 + stopIndex * 18),
                completedAt,
                updatedAt: dates.now,
              },
            });

          if (stopStatus === 'completed') {
            await tx
              .insert(collectionEvents)
              .values({
                id: deterministicUuid(`collection-event:${tour.key}:${stopIndex + 1}`),
                tourStopId: deterministicUuid(`tour-stop:${tour.key}:${stopIndex + 1}`),
                containerId: container.id,
                actorUserId: assignedAgentId,
                volumeLiters: 520 + stopIndex * 80,
                notes: 'Collecte demo deja validee avant la soutenance.',
                latitude: container.latitude,
                longitude: container.longitude,
                collectedAt: completedAt ?? dates.now,
                createdAt: completedAt ?? dates.now,
              })
              .onConflictDoUpdate({
                target: collectionEvents.id,
                set: {
                  volumeLiters: 520 + stopIndex * 80,
                  notes: 'Collecte demo deja validee avant la soutenance.',
                  collectedAt: completedAt ?? dates.now,
                },
              });
          }
        }

        const route = buildRoute(
          DEMO_ZONES.find((zone) => zone.code === tour.zoneCode) ?? DEMO_ZONES[0],
          tourContainerContexts,
        );
        await tx
          .insert(tourRoutes)
          .values({
            id: deterministicUuid(`tour-route:${tour.key}`),
            tourId,
            geometry: route.geometry,
            distanceMeters: route.distanceMeters,
            durationMinutes: route.durationMinutes,
            source: 'fallback',
            provider: 'soutenance_seed',
            resolvedAt: dates.now,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: tourRoutes.tourId,
            set: {
              geometry: route.geometry,
              distanceMeters: route.distanceMeters,
              durationMinutes: route.durationMinutes,
              source: 'fallback',
              provider: 'soutenance_seed',
              resolvedAt: dates.now,
              updatedAt: dates.now,
            },
          });
      }

      for (const type of DEMO_ANOMALY_TYPE_SEEDS) {
        await tx
          .insert(anomalyTypes)
          .values({
            id: deterministicUuid(`anomaly-type:${type.code}`),
            code: type.code,
            label: type.label,
            description: type.description,
            isActive: true,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoNothing();
      }

      const anomalyRows = await tx
        .select({ id: anomalyTypes.id, code: anomalyTypes.code })
        .from(anomalyTypes)
        .where(
          inArray(anomalyTypes.code, [
            'SOUT-ANOM-BLOCKED-ACCESS',
            'SOUT-ANOM-DAMAGED-CONTAINER',
            'SOUT-ANOM-SAFETY-RISK',
          ]),
        );
      const anomalyTypeIds = new Map(anomalyRows.map((type) => [type.code, type.id]));

      const anomalySeeds = [
        { typeCode: 'SOUT-ANOM-BLOCKED-ACCESS', tourKey: 'live-centre-nord', stopIndex: 2, severity: 'high' },
        {
          typeCode: 'SOUT-ANOM-DAMAGED-CONTAINER',
          tourKey: 'centre-completed-yesterday',
          stopIndex: 1,
          severity: 'medium',
        },
        { typeCode: 'SOUT-ANOM-SAFETY-RISK', tourKey: 'sud-completed', stopIndex: 3, severity: 'critical' },
        { typeCode: 'SOUT-ANOM-BLOCKED-ACCESS', tourKey: 'rive-gauche-planned', stopIndex: 1, severity: 'medium' },
        { typeCode: 'SOUT-ANOM-DAMAGED-CONTAINER', tourKey: 'canal-planned', stopIndex: 2, severity: 'high' },
      ];

      for (const [index, anomaly] of anomalySeeds.entries()) {
        const tour = tourContexts.find((candidate) => candidate.key === anomaly.tourKey);
        if (!tour) {
          throw new Error(`Missing anomaly tour: ${anomaly.tourKey}`);
        }

        const anomalyTypeId = requireMapValue(anomalyTypeIds, anomaly.typeCode, 'anomaly type');
        const tourStopId = deterministicUuid(`tour-stop:${tour.key}:${anomaly.stopIndex}`);
        const reporterUserId = tour.assignedAgentId;

        await tx
          .insert(anomalyReports)
          .values({
            id: deterministicUuid(`anomaly-report:${index + 1}`),
            anomalyTypeId,
            tourId: tour.id,
            tourStopId,
            reporterUserId,
            comments: 'Anomalie demo visible dans le suivi manager et agent.',
            severity: anomaly.severity,
            status: index === 1 ? 'resolved' : 'reported',
            reportedAt: addMinutes(dates.now, -220 + index * 30),
            createdAt: addMinutes(dates.now, -220 + index * 30),
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: anomalyReports.id,
            set: {
              anomalyTypeId,
              tourId: tour.id,
              tourStopId,
              reporterUserId,
              comments: 'Anomalie demo visible dans le suivi manager et agent.',
              severity: anomaly.severity,
              status: index === 1 ? 'resolved' : 'reported',
              reportedAt: addMinutes(dates.now, -220 + index * 30),
              updatedAt: dates.now,
            },
          });
      }

      const alertSeeds = [
        {
          key: 'critical-container-001',
          containerCode: 'SOUT-C-001',
          eventType: 'container_fill_critical',
          severity: 'critical',
          status: 'open',
          zoneCode: 'SOUT-ZONE-01',
        },
        {
          key: 'critical-container-006',
          containerCode: 'SOUT-C-006',
          eventType: 'container_fill_critical',
          severity: 'critical',
          status: 'acknowledged',
          zoneCode: 'SOUT-ZONE-02',
        },
        {
          key: 'citizen-report-queue',
          containerCode: 'SOUT-C-012',
          eventType: 'citizen_report_received',
          severity: 'warning',
          status: 'open',
          zoneCode: 'SOUT-ZONE-03',
        },
        {
          key: 'agent-anomaly-live',
          containerCode: 'SOUT-C-002',
          eventType: 'anomaly_reported',
          severity: 'high',
          status: 'open',
          zoneCode: 'SOUT-ZONE-01',
        },
        {
          key: 'critical-container-021',
          containerCode: 'SOUT-C-021',
          eventType: 'container_fill_critical',
          severity: 'critical',
          status: 'open',
          zoneCode: 'SOUT-ZONE-05',
        },
        {
          key: 'resolved-overflow',
          containerCode: 'SOUT-C-028',
          eventType: 'overflow_resolved',
          severity: 'info',
          status: 'resolved',
          zoneCode: 'SOUT-ZONE-06',
        },
      ];

      for (const alert of alertSeeds) {
        const container = containerContexts.get(alert.containerCode);
        if (!container) {
          throw new Error(`Missing alert container: ${alert.containerCode}`);
        }

        await tx
          .insert(alertEvents)
          .values({
            id: deterministicUuid(`alert:${alert.key}`),
            ruleId: null,
            containerId: container.id,
            zoneId: requireMapValue(zoneIds, alert.zoneCode, 'demo zone'),
            sourceEventKey: `soutenance:${alert.key}`,
            eventType: alert.eventType,
            severity: alert.severity,
            triggeredAt: addMinutes(dates.now, -180 + alertSeeds.indexOf(alert) * 20),
            currentStatus: alert.status,
            acknowledgedByUserId: alert.status === 'acknowledged' ? managerId : null,
            resolvedAt: alert.status === 'resolved' ? addMinutes(dates.now, -20) : null,
            payloadSnapshot: buildAlertPayload(alert.eventType, {
              containerCode: container.code,
              fillLevelPercent: container.fillLevelPercent,
              zoneCode: alert.zoneCode,
            }),
          })
          .onConflictDoUpdate({
            target: alertEvents.sourceEventKey,
            set: {
              containerId: container.id,
              zoneId: requireMapValue(zoneIds, alert.zoneCode, 'demo zone'),
              eventType: alert.eventType,
              severity: alert.severity,
              triggeredAt: addMinutes(dates.now, -180 + alertSeeds.indexOf(alert) * 20),
              currentStatus: alert.status,
              acknowledgedByUserId: alert.status === 'acknowledged' ? managerId : null,
              resolvedAt: alert.status === 'resolved' ? addMinutes(dates.now, -20) : null,
              payloadSnapshot: buildAlertPayload(alert.eventType, {
                containerCode: container.code,
                fillLevelPercent: container.fillLevelPercent,
                zoneCode: alert.zoneCode,
              }),
            },
          });
      }

      for (const [index, user] of DEMO_USERS.filter((candidate) => candidate.role === 'citizen').entries()) {
        await tx
          .insert(notificationDevices)
          .values({
            id: deterministicUuid(`notification-device:${user.key}`),
            userId: requireMapValue(userIds, user.email, 'demo citizen'),
            provider: 'expo',
            platform: index % 2 === 0 ? 'ios' : 'android',
            pushToken: `ExponentPushToken[soutenance-${index + 1}]`,
            status: 'active',
            appVersion: '1.0.0-demo',
            deviceLabel: `Soutenance mobile ${index + 1}`,
            metadata: { demoDataset: 'soutenance' },
            lastRegisteredAt: dates.now,
            lastSeenAt: dates.now,
            createdAt: dates.now,
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: [notificationDevices.provider, notificationDevices.pushToken],
            set: {
              userId: requireMapValue(userIds, user.email, 'demo citizen'),
              platform: index % 2 === 0 ? 'ios' : 'android',
              status: 'active',
              lastSeenAt: dates.now,
              updatedAt: dates.now,
            },
          });
      }

      const notificationSeeds = [
        {
          key: 'manager-critical',
          eventType: 'container_fill_critical',
          entityType: 'alert_event',
          audienceScope: 'role:manager',
          title: 'Conteneurs critiques a prioriser',
          body: 'Plusieurs points demo depassent le seuil critique dans les zones soutenance.',
          recipients: ['soutenance.manager1@ecotrack.local', 'soutenance.manager2@ecotrack.local'],
        },
        {
          key: 'citizen-confirmation',
          eventType: 'citizen_report_received',
          entityType: 'citizen_report',
          audienceScope: 'user:citizen',
          title: 'Signalement recu',
          body: 'Votre signalement demo est visible par le gestionnaire.',
          recipients: ['soutenance.citizen1@ecotrack.local'],
        },
        {
          key: 'agent-tour-ready',
          eventType: 'tour_assigned',
          entityType: 'tour',
          audienceScope: 'user:agent',
          title: 'Tournee terrain prete',
          body: 'Une tournee demo est assignee avec un arret actif a valider.',
          recipients: ['soutenance.agent1@ecotrack.local'],
        },
      ];

      for (const notification of notificationSeeds) {
        const notificationId = deterministicUuid(`notification:${notification.key}`);
        await tx
          .insert(notifications)
          .values({
            id: notificationId,
            eventType: notification.eventType,
            entityType: notification.entityType,
            entityId: `SOUT-NOTIFICATION-${notification.key}`,
            audienceScope: notification.audienceScope,
            title: notification.title,
            body: notification.body,
            preferredChannels: ['inbox', 'email', 'push'],
            scheduledAt: addMinutes(dates.now, -45 + notificationSeeds.indexOf(notification) * 10),
            status: 'queued',
            createdAt: dates.now,
          })
          .onConflictDoUpdate({
            target: notifications.id,
            set: {
              entityId: `SOUT-NOTIFICATION-${notification.key}`,
              title: notification.title,
              body: notification.body,
              status: 'queued',
            },
          });

        await tx
          .insert(notificationDeliveries)
          .values({
            id: deterministicUuid(`notification-delivery:${notification.key}`),
            notificationId,
            channel: 'email',
            recipientAddress: notification.audienceScope,
            providerMessageId: `soutenance-${notification.key}`,
            deliveryStatus: 'delivered',
            attemptCount: 1,
            lastAttemptAt: dates.now,
            deliveredAt: dates.now,
            createdAt: dates.now,
          })
          .onConflictDoUpdate({
            target: notificationDeliveries.id,
            set: {
              deliveryStatus: 'delivered',
              lastAttemptAt: dates.now,
              deliveredAt: dates.now,
            },
          });

        for (const recipientEmail of notification.recipients) {
          const recipientUserId = requireMapValue(userIds, recipientEmail, 'notification recipient');
          await tx
            .insert(notificationRecipients)
            .values({
              id: deterministicUuid(`notification-recipient:${notification.key}:${recipientEmail}`),
              notificationId,
              userId: recipientUserId,
              deliveryChannel: 'inbox',
              deepLink: '/dashboard',
              payload: {
                demoDataset: 'soutenance',
                eventType: notification.eventType,
              },
              status: recipientEmail.includes('citizen1') ? 'unread' : 'read',
              readAt: recipientEmail.includes('citizen1') ? null : dates.now,
              createdAt: dates.now,
              updatedAt: dates.now,
            })
            .onConflictDoUpdate({
              target: notificationRecipients.id,
              set: {
                notificationId,
                userId: recipientUserId,
                status: recipientEmail.includes('citizen1') ? 'unread' : 'read',
                readAt: recipientEmail.includes('citizen1') ? null : dates.now,
                updatedAt: dates.now,
              },
            });
        }
      }

      for (let index = 0; index < 3; index += 1) {
        await tx
          .insert(reportExports)
          .values({
            id: deterministicUuid(`report-export:${index + 1}`),
            requestedByUserId: managerId,
            periodStart: addMinutes(dates.todayStart, -1_440 * (index + 1)),
            periodEnd: dates.now,
            selectedKpis: ['signalements', 'collectes', 'anomalies', 'taux_resolution'],
            format: index === 1 ? 'csv' : 'pdf',
            status: 'generated',
            sendEmail: index === 0,
            emailTo: index === 0 ? 'soutenance.manager1@ecotrack.local' : null,
            fileContent: Buffer.from(`Soutenance demo export ${index + 1}`).toString('base64'),
            createdAt: addMinutes(dates.now, -360 + index * 80),
            updatedAt: dates.now,
          })
          .onConflictDoUpdate({
            target: reportExports.id,
            set: {
              status: 'generated',
              updatedAt: dates.now,
            },
          });
      }

      const auditSeeds = [
        { action: 'soutenance_seed_applied', resourceType: 'database', userId: adminId },
        { action: 'demo_tour_planned', resourceType: 'tours', userId: managerId },
        { action: 'demo_alert_acknowledged', resourceType: 'alert_events', userId: managerId },
        { action: 'demo_roles_reviewed', resourceType: 'users', userId: adminId },
        { action: 'demo_report_triaged', resourceType: 'citizen_reports', userId: managerId },
      ];

      for (const [index, audit] of auditSeeds.entries()) {
        await tx
          .insert(auditLogs)
          .values({
            id: deterministicUuid(`audit:${audit.action}`),
            userId: audit.userId,
            action: audit.action,
            resourceType: audit.resourceType,
            resourceId: 'soutenance-demo',
            oldValues: null,
            newValues: {
              demoDataset: 'soutenance',
              appliedAt: dates.now.toISOString(),
            },
            ipAddress: '127.0.0.1',
            userAgent: 'EcoTrack soutenance seed',
            createdAt: addMinutes(dates.now, -30 + index * 4),
          })
          .onConflictDoNothing();
      }
    });
  } finally {
    await dispose();
  }
}
