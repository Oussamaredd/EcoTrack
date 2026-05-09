import { and, asc, eq, inArray } from 'drizzle-orm';
import { createDatabaseInstance } from '../client.js';
import {
  alertEvents,
  alertRules,
  anomalyReports,
  anomalyTypes,
  challengeParticipations,
  challenges,
  citizenReports,
  collectionEvents,
  comments,
  containerTypes,
  containers,
  gamificationProfiles,
  measurements,
  notificationDeliveries,
  notifications,
  roles,
  sensorDevices,
  systemSettings,
  tickets,
  tourRoutes,
  tourStops,
  tours,
  userRoles,
  users,
  zones,
} from '../schema/index.js';

type RoleSeed = {
  name: string;
  description: string;
  permissions: string[];
};

type UserSeed = {
  email: string;
  displayName: string;
  role: string;
  assignedRoles: string[];
  zoneCode?: string;
  isActive: boolean;
  authProvider: 'local' | 'google';
  passwordHash?: string | null;
  googleId?: string | null;
};

type TicketSeed = {
  title: string;
  description: string;
  status: string;
  priority: string;
  requesterEmail: string;
  assigneeEmail: string;
};

type CommentSeed = {
  ticketTitle: string;
  authorEmail: string;
  body: string;
};

type SettingSeed = {
  key: string;
  value: unknown;
  description: string;
  isPublic: boolean;
};

type ZoneSeed = {
  name: string;
  code: string;
  description?: string;
};

type ContainerSeed = {
  code: string;
  label: string;
  status: string;
  fillLevelPercent: number;
  fillRatePerHour: number;
  lastMeasurementAt: Date;
  lastCollectedAt: Date | null;
  zoneCode: string;
  containerTypeCode: string;
  latitude?: string;
  longitude?: string;
};

type ContainerSeedBlueprint = Omit<ContainerSeed, 'label' | 'status' | 'fillRatePerHour' | 'lastMeasurementAt' | 'lastCollectedAt'> & {
  address: string;
};

type ContainerTypeSeed = {
  code: string;
  label: string;
  wasteStream: string;
  nominalCapacityLiters: number;
  defaultFillAlertPercent: number;
  defaultCriticalAlertPercent: number;
  colorCode: string;
};

type TourSeed = {
  name: string;
  status: string;
  zoneCode: string;
  assignedAgentEmail: string;
  scheduledForOffsetDays: number;
  stopContainerCodes: string[];
};

type CitizenReportSeed = {
  containerCode: string;
  reporterEmail: string;
  status: string;
  description: string;
  latitude?: string;
  longitude?: string;
};

type GamificationProfileSeed = {
  email: string;
  points: number;
  level: number;
  badges: string[];
};

type ChallengeSeed = {
  code: string;
  title: string;
  description: string;
  targetValue: number;
  rewardPoints: number;
  status: string;
};

type ChallengeParticipationSeed = {
  challengeCode: string;
  userEmail: string;
  progress: number;
  status: string;
};

type AnomalyTypeSeed = {
  code: string;
  label: string;
  description: string;
};

type AnomalyReportSeed = {
  anomalyTypeCode: string;
  tourName: string;
  stopOrder: number;
  reporterEmail: string;
  comments: string;
  photoUrl?: string;
  severity: string;
};

type SensorDeviceSeed = {
  containerCode: string;
  deviceUid: string;
  hardwareModel: string;
  firmwareVersion: string;
  installStatus: string;
  batteryPercent: number;
  lastSeenAt: string;
  installedAt: string;
};

type MeasurementSeed = {
  deviceUid: string;
  containerCode: string;
  measuredAt: string;
  fillLevelPercent: number;
  temperatureC: number;
  batteryPercent: number;
  signalStrength: number;
  measurementQuality: string;
};

type AlertRuleSeed = {
  scopeType: string;
  scopeKey?: string | null;
  warningFillPercent?: number | null;
  criticalFillPercent?: number | null;
  anomalyTypeCode?: string | null;
  notifyChannels: string[];
  recipientRole?: string | null;
  isActive: boolean;
};

type AlertEventSeed = {
  ruleScopeType?: string | null;
  ruleScopeKey?: string | null;
  containerCode?: string | null;
  zoneCode?: string | null;
  eventType: string;
  severity: string;
  currentStatus: string;
  acknowledgedByEmail?: string | null;
  payloadSnapshot: Record<string, unknown>;
};

type NotificationSeed = {
  eventType: string;
  entityType: string;
  entityId: string;
  audienceScope: string;
  title: string;
  body: string;
  preferredChannels: string[];
  status: string;
  deliveries: Array<{
    channel: string;
    recipientAddress: string;
    deliveryStatus: string;
    attemptCount: number;
  }>;
};

type RouteGeometryLineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

type ZoneDepotSeed = {
  label: string;
  latitude: string;
  longitude: string;
};

type PersistedRouteSeed = {
  geometry: RouteGeometryLineString;
  distanceMeters: number | null;
  durationMinutes: number | null;
  source: 'fallback';
  provider: 'seed';
};

const LEGACY_ADMIN_PERMISSIONS = [
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
  'tickets.read',
  'tickets.write',
  'audit.read',
  'settings.write',
];

const ECOTRACK_ADMIN_PERMISSIONS = [
  'ecotrack.containers.read',
  'ecotrack.containers.write',
  'ecotrack.zones.read',
  'ecotrack.zones.write',
  'ecotrack.tours.read',
  'ecotrack.tours.write',
  'ecotrack.citizenReports.read',
  'ecotrack.citizenReports.write',
  'ecotrack.gamification.read',
  'ecotrack.gamification.write',
  'ecotrack.analytics.read',
];

const FULL_ADMIN_PERMISSIONS = [...LEGACY_ADMIN_PERMISSIONS, ...ECOTRACK_ADMIN_PERMISSIONS];

const ROLE_SEEDS: RoleSeed[] = [
  {
    name: 'super_admin',
    description: 'Super Administrator',
    permissions: FULL_ADMIN_PERMISSIONS,
  },
  {
    name: 'admin',
    description: 'Administrator',
    permissions: FULL_ADMIN_PERMISSIONS,
  },
  {
    name: 'manager',
    description: 'Manager',
    permissions: [
      'users.read',
      'tickets.read',
      'audit.read',
      'ecotrack.containers.read',
      'ecotrack.zones.read',
      'ecotrack.tours.read',
      'ecotrack.tours.write',
      'ecotrack.citizenReports.read',
      'ecotrack.gamification.read',
      'ecotrack.analytics.read',
    ],
  },
  {
    name: 'agent',
    description: 'Agent',
    permissions: [
      'tickets.read',
      'tickets.write',
      'ecotrack.containers.read',
      'ecotrack.tours.read',
      'ecotrack.tours.write',
      'ecotrack.citizenReports.read',
      'ecotrack.citizenReports.write',
    ],
  },
  {
    name: 'citizen',
    description: 'Citizen',
    permissions: [
      'ecotrack.containers.read',
      'ecotrack.citizenReports.read',
      'ecotrack.citizenReports.write',
      'ecotrack.gamification.read',
    ],
  },
];

const MANUAL_TEST_PASSWORD_HASH = '$2a$10$UQth0tiCN3PWdZN8C8pEeuFJ.6ceJ/MP46cz/TAxZ/r6EFjuifdv2';

const USER_SEEDS: UserSeed[] = [
  {
    email: 'test@ecotrack.local',
    displayName: 'Local Smoke User',
    role: 'agent',
    assignedRoles: ['agent'],
    zoneCode: 'ZONE-PARIS-01',
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'a@admin.fr',
    displayName: 'EcoTrack Super Admin',
    role: 'super_admin',
    assignedRoles: ['super_admin', 'admin'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'superadmin@example.com',
    displayName: 'Super Admin',
    role: 'super_admin',
    assignedRoles: ['super_admin', 'admin'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'admin@example.com',
    displayName: 'Admin User',
    role: 'admin',
    assignedRoles: ['admin'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'manager@example.com',
    displayName: 'Manager User',
    role: 'manager',
    assignedRoles: ['manager'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'agent@example.com',
    displayName: 'Agent User',
    role: 'agent',
    assignedRoles: ['agent'],
    zoneCode: 'ZONE-PARIS-01',
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'citizen@example.com',
    displayName: 'Citizen User',
    role: 'citizen',
    assignedRoles: ['citizen'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
];

const TICKET_SEEDS: TicketSeed[] = [];

const COMMENT_SEEDS: CommentSeed[] = [];

const SETTING_SEEDS: SettingSeed[] = [
  {
    key: 'site_name',
    value: 'EcoTrack Platform',
    description: 'Site name',
    isPublic: true,
  },
  {
    key: 'site_description',
    value: 'EcoTrack support and operations platform',
    description: 'Site description',
    isPublic: true,
  },
  {
    key: 'default_user_role',
    value: 'citizen',
    description: 'Default role for new users',
    isPublic: false,
  },
  {
    key: 'maintenance_mode',
    value: false,
    description: 'Maintenance mode flag',
    isPublic: false,
  },
];

const CONTAINER_LABEL_SUFFIX_BY_TYPE: Record<string, string> = {
  glass: 'Verre',
  recyclables: 'Trilib',
  textile: 'Textile',
  general_mixed: 'Mixed Waste',
};

const buildSeedContainerLabel = (address: string, containerTypeCode: string) =>
  `${address} - ${CONTAINER_LABEL_SUFFIX_BY_TYPE[containerTypeCode] ?? 'Container'}`;

const resolveSeedContainerStatus = (fillLevelPercent: number) =>
  fillLevelPercent >= 75 ? 'attention_required' : 'available';

const resolveSeedFillRatePerHour = (code: string) =>
  4 + [...code].reduce((total, char) => total + char.charCodeAt(0), 0) % 9;

const resolveSeedLastMeasurementAt = (code: string) => {
  const now = Date.now();
  const minuteOffset = [...code].reduce((total, char) => total + char.charCodeAt(0), 0) % (6 * 60);
  return new Date(now - minuteOffset * 60 * 1000);
};

// Curated sample from Paris open-data collection points. Keep the footprint small for demo and Neon plans.
const ZONE_SEEDS: ZoneSeed[] = [
  {
    name: 'Paris 1er - Louvre',
    code: 'ZONE-PARIS-01',
    description: 'Operational collection zone for Louvre, Palais-Royal, and Les Halles.',
  },
  {
    name: 'Paris 2e - Bourse',
    code: 'ZONE-PARIS-02',
    description: 'Operational collection zone for Bourse, Montorgueil, and Sentier.',
  },
  {
    name: 'Paris 3e - Temple',
    code: 'ZONE-PARIS-03',
    description: 'Operational collection zone for Temple, Arts-et-Metiers, and the upper Marais.',
  },
  {
    name: 'Paris 4e - Hotel-de-Ville',
    code: 'ZONE-PARIS-04',
    description: 'Operational collection zone for Hotel-de-Ville, Saint-Gervais, and Ile Saint-Louis.',
  },
  {
    name: 'Paris 5e - Pantheon',
    code: 'ZONE-PARIS-05',
    description: 'Operational collection zone for Pantheon, Jardin des Plantes, and Saint-Victor.',
  },
  {
    name: 'Paris 6e - Luxembourg',
    code: 'ZONE-PARIS-06',
    description: 'Operational collection zone for Luxembourg, Odeon, and Saint-Germain-des-Pres.',
  },
  {
    name: 'Paris 7e - Palais-Bourbon',
    code: 'ZONE-PARIS-07',
    description: 'Operational collection zone for Invalides, Ecole Militaire, and the Seine embankments.',
  },
  {
    name: 'Paris 8e - Elysee',
    code: 'ZONE-PARIS-08',
    description: 'Operational collection zone for Madeleine, Europe, and Champs-Elysees side streets.',
  },
  {
    name: 'Paris 9e - Opera',
    code: 'ZONE-PARIS-09',
    description: 'Operational collection zone for Opera, Pigalle, and Saint-Georges.',
  },
  {
    name: 'Paris 10e - Entrepot',
    code: 'ZONE-PARIS-10',
    description: 'Operational collection zone for Canal Saint-Martin, Gare de l Est, and Saint-Vincent-de-Paul.',
  },
  {
    name: 'Paris 11e - Popincourt',
    code: 'ZONE-PARIS-11',
    description: 'Operational collection zone for Republique eastbound, Bastille north, and Menilmontant gateway streets.',
  },
  {
    name: 'Paris 12e - Reuilly',
    code: 'ZONE-PARIS-12',
    description: 'Operational collection zone for Picpus, Bercy, and Daumesnil corridors.',
  },
  {
    name: 'Paris 13e - Gobelins',
    code: 'ZONE-PARIS-13',
    description: 'Operational collection zone for Gobelins, Butte-aux-Cailles, and Avenue de France.',
  },
  {
    name: 'Paris 14e - Observatoire',
    code: 'ZONE-PARIS-14',
    description: 'Operational collection zone for Montparnasse south, Denfert-Rochereau, and Alesia.',
  },
  {
    name: 'Paris 15e - Vaugirard',
    code: 'ZONE-PARIS-15',
    description: 'Operational collection zone for Vaugirard, Beaugrenelle, and Convention.',
  },
  {
    name: 'Paris 16e - Passy',
    code: 'ZONE-PARIS-16',
    description: 'Operational collection zone for Passy, Trocadero, and Porte Dauphine.',
  },
  {
    name: 'Paris 17e - Batignolles-Monceau',
    code: 'ZONE-PARIS-17',
    description: 'Operational collection zone for Batignolles, Ternes, and Monceau fringe streets.',
  },
  {
    name: 'Paris 18e - Buttes-Montmartre',
    code: 'ZONE-PARIS-18',
    description: 'Operational collection zone for Montmartre foothills, Clignancourt, and Porte de la Chapelle.',
  },
  {
    name: 'Paris 19e - Buttes-Chaumont',
    code: 'ZONE-PARIS-19',
    description: 'Operational collection zone for Villette, Buttes-Chaumont, and Canal de l Ourcq.',
  },
  {
    name: 'Paris 20e - Menilmontant',
    code: 'ZONE-PARIS-20',
    description: 'Operational collection zone for Gambetta, Belleville south, and the eastern Paris boundary.',
  },
];

const CONTAINER_TYPE_SEEDS: ContainerTypeSeed[] = [
  {
    code: 'glass',
    label: 'Glass',
    wasteStream: 'glass',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 70,
    defaultCriticalAlertPercent: 90,
    colorCode: '#457B9D',
  },
  {
    code: 'recyclables',
    label: 'Recyclables',
    wasteStream: 'recyclable',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 75,
    defaultCriticalAlertPercent: 90,
    colorCode: '#2A9D8F',
  },
  {
    code: 'textile',
    label: 'Textile',
    wasteStream: 'textile',
    nominalCapacityLiters: 800,
    defaultFillAlertPercent: 70,
    defaultCriticalAlertPercent: 90,
    colorCode: '#C77D3B',
  },
  {
    code: 'general_mixed',
    label: 'General Mixed Waste',
    wasteStream: 'mixed',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 80,
    defaultCriticalAlertPercent: 95,
    colorCode: '#4F5D75',
  },
];

const CONTAINER_SEED_BLUEPRINTS: ContainerSeedBlueprint[] = [];

const CONTAINER_SEEDS: ContainerSeed[] = CONTAINER_SEED_BLUEPRINTS.map(({ address, ...seed }) => ({
  ...seed,
  label: buildSeedContainerLabel(address, seed.containerTypeCode),
  status: resolveSeedContainerStatus(seed.fillLevelPercent),
  fillRatePerHour: resolveSeedFillRatePerHour(seed.code),
  lastMeasurementAt: resolveSeedLastMeasurementAt(seed.code),
  lastCollectedAt: seed.fillLevelPercent === 0 ? resolveSeedLastMeasurementAt(seed.code) : null,
}));

const ZONE_DEPOT_SEEDS = new Map<string, ZoneDepotSeed>([
  ['ZONE-PARIS-01', { label: 'Depot Paris 1er - Louvre', latitude: '48.863735', longitude: '2.338321' }],
  ['ZONE-PARIS-02', { label: 'Depot Paris 2e - Bourse', latitude: '48.868884', longitude: '2.343380' }],
  ['ZONE-PARIS-03', { label: 'Depot Paris 3e - Temple', latitude: '48.866299', longitude: '2.355614' }],
  ['ZONE-PARIS-04', { label: 'Depot Paris 4e - Hotel-de-Ville', latitude: '48.851630', longitude: '2.364043' }],
  ['ZONE-PARIS-05', { label: 'Depot Paris 5e - Pantheon', latitude: '48.844527', longitude: '2.353178' }],
  ['ZONE-PARIS-06', { label: 'Depot Paris 6e - Luxembourg', latitude: '48.849647', longitude: '2.336317' }],
  ['ZONE-PARIS-07', { label: 'Depot Paris 7e - Palais-Bourbon', latitude: '48.852069', longitude: '2.319796' }],
  ['ZONE-PARIS-08', { label: 'Depot Paris 8e - Elysee', latitude: '48.877334', longitude: '2.314464' }],
  ['ZONE-PARIS-09', { label: 'Depot Paris 9e - Opera', latitude: '48.877369', longitude: '2.338890' }],
  ['ZONE-PARIS-10', { label: 'Depot Paris 10e - Entrepot', latitude: '48.877730', longitude: '2.365295' }],
  ['ZONE-PARIS-11', { label: 'Depot Paris 11e - Popincourt', latitude: '48.864805', longitude: '2.379546' }],
  ['ZONE-PARIS-12', { label: 'Depot Paris 12e - Reuilly', latitude: '48.841977', longitude: '2.398608' }],
  ['ZONE-PARIS-13', { label: 'Depot Paris 13e - Gobelins', latitude: '48.823809', longitude: '2.359219' }],
  ['ZONE-PARIS-14', { label: 'Depot Paris 14e - Observatoire', latitude: '48.830181', longitude: '2.328160' }],
  ['ZONE-PARIS-15', { label: 'Depot Paris 15e - Vaugirard', latitude: '48.837760', longitude: '2.302848' }],
  ['ZONE-PARIS-16', { label: 'Depot Paris 16e - Passy', latitude: '48.867791', longitude: '2.289519' }],
  ['ZONE-PARIS-17', { label: 'Depot Paris 17e - Batignolles-Monceau', latitude: '48.884711', longitude: '2.301703' }],
  ['ZONE-PARIS-18', { label: 'Depot Paris 18e - Buttes-Montmartre', latitude: '48.891572', longitude: '2.346511' }],
  ['ZONE-PARIS-19', { label: 'Depot Paris 19e - Buttes-Chaumont', latitude: '48.879481', longitude: '2.373110' }],
  ['ZONE-PARIS-20', { label: 'Depot Paris 20e - Menilmontant', latitude: '48.848128', longitude: '2.410432' }],
]);

const TOUR_SEEDS: TourSeed[] = [];

const LEGACY_TOUR_SEED_NAMES: string[] = [];

const CITIZEN_REPORT_SEEDS: CitizenReportSeed[] = [];

const GAMIFICATION_PROFILE_SEEDS: GamificationProfileSeed[] = [];

const CHALLENGE_SEEDS: ChallengeSeed[] = [
  {
    code: 'CHL-NEIGHBORHOOD-03',
    title: 'Neighborhood Reporter Sprint',
    description: 'Submit 3 validated neighborhood reports this month.',
    targetValue: 3,
    rewardPoints: 75,
    status: 'active',
  },
  {
    code: 'CHL-SMART-ROUTE-05',
    title: 'Smart Route Support',
    description: 'Report 5 containers before peak overflow windows.',
    targetValue: 5,
    rewardPoints: 120,
    status: 'active',
  },
];

const CHALLENGE_PARTICIPATION_SEEDS: ChallengeParticipationSeed[] = [];

const ANOMALY_TYPE_SEEDS: AnomalyTypeSeed[] = [
  {
    code: 'ANOM-BLOCKED-ACCESS',
    label: 'Blocked access',
    description: 'Container cannot be reached due to blocked road or parked vehicles.',
  },
  {
    code: 'ANOM-DAMAGED-CONTAINER',
    label: 'Damaged container',
    description: 'Container or lid appears damaged and requires intervention.',
  },
  {
    code: 'ANOM-SAFETY-RISK',
    label: 'Safety risk',
    description: 'Safety hazard encountered during collection operation.',
  },
];

const ANOMALY_REPORT_SEEDS: AnomalyReportSeed[] = [];

const SENSOR_DEVICE_SEEDS: SensorDeviceSeed[] = [];

const MEASUREMENT_SEEDS: MeasurementSeed[] = [];

const ALERT_RULE_SEEDS: AlertRuleSeed[] = [
  {
    scopeType: 'global',
    scopeKey: null,
    warningFillPercent: 80,
    criticalFillPercent: 95,
    anomalyTypeCode: null,
    notifyChannels: ['email'],
    recipientRole: 'manager',
    isActive: true,
  },
  {
    scopeType: 'container_type',
    scopeKey: 'recyclables',
    warningFillPercent: 75,
    criticalFillPercent: 90,
    anomalyTypeCode: null,
    notifyChannels: ['email', 'push'],
    recipientRole: 'manager',
    isActive: true,
  },
];

const ALERT_EVENT_SEEDS: AlertEventSeed[] = [];

const NOTIFICATION_SEEDS: NotificationSeed[] = [];

const CLOSED_STATUSES = new Set(['completed', 'closed']);
const EARTH_RADIUS_KM = 6371;
const AVERAGE_ROUTE_SPEED_KMH = 24;
const STOP_SERVICE_DURATION_MINUTES = 4;

const toNumberOrNull = (value: unknown) => {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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

const buildPersistedRouteSeed = (
  stops: Array<{ stopOrder: number; latitude: string | null; longitude: string | null }>,
  depot?: ZoneDepotSeed | null,
): PersistedRouteSeed | null => {
  const normalizedStops = stops
    .map((stop) => {
      const latitude = toNumberOrNull(stop.latitude);
      const longitude = toNumberOrNull(stop.longitude);

      if (latitude == null || longitude == null) {
        return null;
      }

      return {
        stopOrder: stop.stopOrder,
        latitude,
        longitude,
      };
    })
    .filter(
      (
        stop,
      ): stop is {
        stopOrder: number;
        latitude: number;
        longitude: number;
      } => stop != null,
    )
    .sort((left, right) => left.stopOrder - right.stopOrder);

  if (normalizedStops.length === 0) {
    return null;
  }

  const routePoints = [
    ...(depot
      ? [
          {
            stopOrder: 0,
            latitude: Number(depot.latitude),
            longitude: Number(depot.longitude),
          },
        ]
      : []),
    ...normalizedStops,
  ];

  let totalDistanceKm = 0;
  for (let index = 1; index < routePoints.length; index += 1) {
    totalDistanceKm += haversineDistanceKm(routePoints[index - 1], routePoints[index]);
  }

  return {
    geometry: {
      type: 'LineString',
      coordinates:
        routePoints.length === 1
          ? [
              [routePoints[0].longitude, routePoints[0].latitude],
              [routePoints[0].longitude, routePoints[0].latitude],
            ]
          : routePoints.map((stop) => [stop.longitude, stop.latitude]),
    },
    distanceMeters: Math.max(0, Math.round(totalDistanceKm * 1000)),
    durationMinutes: Math.max(
      STOP_SERVICE_DURATION_MINUTES,
      Math.round(
        (totalDistanceKm / AVERAGE_ROUTE_SPEED_KMH) * 60 +
          normalizedStops.length * STOP_SERVICE_DURATION_MINUTES,
      ),
    ),
    source: 'fallback',
    provider: 'seed',
  };
};

export async function seedDatabase() {
  const { db, dispose } = createDatabaseInstance();
  const now = new Date();

  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DATABASE_SEED_IN_PROD !== 'true') {
      throw new Error('Refusing to run database seed in production without ALLOW_DATABASE_SEED_IN_PROD=true');
    }

    await db.transaction(async (tx) => {
      const roleIds = new Map<string, string>();
      for (const seed of ROLE_SEEDS) {
        await tx
        .insert(roles)
        .values({
          name: seed.name,
          description: seed.description,
          permissions: seed.permissions,
        })
        .onConflictDoUpdate({
          target: roles.name,
          set: {
            description: seed.description,
            permissions: seed.permissions,
            updatedAt: now,
          },
        });

        const [row] = await tx.select().from(roles).where(eq(roles.name, seed.name)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve role: ${seed.name}`);
        }
        roleIds.set(seed.name, row.id);
      }

      const citizenRoleId = roleIds.get('citizen');
      if (citizenRoleId) {
        const legacyUsers = await tx
          .update(users)
          .set({
            role: 'citizen',
            updatedAt: now,
          })
          .where(eq(users.role, 'user'))
          .returning({ id: users.id });

        for (const row of legacyUsers) {
          await tx.delete(userRoles).where(eq(userRoles.userId, row.id));
          await tx
            .insert(userRoles)
            .values({
              userId: row.id,
              roleId: citizenRoleId,
            })
            .onConflictDoNothing();
        }
      }

      const userIds = new Map<string, string>();
      for (const seed of USER_SEEDS) {
        await tx
        .insert(users)
        .values({
          email: seed.email,
          displayName: seed.displayName,
          authProvider: seed.authProvider,
          passwordHash: seed.passwordHash ?? null,
          googleId: seed.googleId ?? null,
          role: seed.role,
          isActive: seed.isActive,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            displayName: seed.displayName,
            authProvider: seed.authProvider,
            passwordHash: seed.passwordHash ?? null,
            googleId: seed.googleId ?? null,
            role: seed.role,
            isActive: seed.isActive,
            updatedAt: now,
          },
        });

        const [row] = await tx.select().from(users).where(eq(users.email, seed.email)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve user: ${seed.email}`);
        }
        userIds.set(seed.email, row.id);
      }

      for (const userSeed of USER_SEEDS) {
        const userId = userIds.get(userSeed.email);
        if (!userId) {
          throw new Error(`User missing for role assignment: ${userSeed.email}`);
        }

        await tx.delete(userRoles).where(eq(userRoles.userId, userId));

        for (const roleName of userSeed.assignedRoles) {
          const roleId = roleIds.get(roleName);
          if (!roleId) {
            throw new Error(`Role missing for user assignment: ${roleName}`);
          }

          await tx
            .insert(userRoles)
            .values({
              userId,
              roleId,
            })
            .onConflictDoNothing();
        }
      }

      const ticketIds = new Map<string, string>();
      for (const seed of TICKET_SEEDS) {
        const requesterId = userIds.get(seed.requesterEmail);
        const assigneeId = userIds.get(seed.assigneeEmail);

        if (!requesterId || !assigneeId) {
          throw new Error(`Missing references for ticket seed: ${seed.title}`);
        }

        const [existing] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.title, seed.title), eq(tickets.requesterId, requesterId)))
        .limit(1);

        if (existing) {
          const closedAtValue = CLOSED_STATUSES.has(seed.status) ? existing.closedAt ?? now : null;

          await tx
            .update(tickets)
            .set({
              description: seed.description,
              status: seed.status,
              priority: seed.priority,
              assigneeId,
              closedAt: closedAtValue,
              updatedAt: now,
            })
            .where(eq(tickets.id, existing.id));

          ticketIds.set(seed.title, existing.id);
          continue;
        }

        const [inserted] = await tx
          .insert(tickets)
          .values({
            title: seed.title,
            description: seed.description,
            status: seed.status,
            priority: seed.priority,
            requesterId,
            assigneeId,
            closedAt: CLOSED_STATUSES.has(seed.status) ? now : null,
          })
          .returning({ id: tickets.id });

        if (!inserted) {
          throw new Error(`Failed to create ticket seed: ${seed.title}`);
        }

        ticketIds.set(seed.title, inserted.id);
      }

      for (const seed of COMMENT_SEEDS) {
        const ticketId = ticketIds.get(seed.ticketTitle);
        const authorId = userIds.get(seed.authorEmail);

        if (!ticketId || !authorId) {
          throw new Error(`Missing references for comment seed on ticket: ${seed.ticketTitle}`);
        }

        const [existing] = await tx
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.ticketId, ticketId),
            eq(comments.authorId, authorId),
            eq(comments.body, seed.body),
          ),
        )
        .limit(1);

        if (!existing) {
          await tx.insert(comments).values({
            ticketId,
            authorId,
            body: seed.body,
          });
        }
      }

      for (const seed of SETTING_SEEDS) {
        await tx
        .insert(systemSettings)
        .values({
          key: seed.key,
          value: seed.value,
          description: seed.description,
          isPublic: seed.isPublic,
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: seed.value,
            description: seed.description,
            isPublic: seed.isPublic,
            updatedAt: now,
          },
        });
      }

      const zoneIds = new Map<string, string>();
      for (const seed of ZONE_SEEDS) {
        const depot = ZONE_DEPOT_SEEDS.get(seed.code);
        if (!depot) {
          throw new Error(`Depot seed missing for zone: ${seed.code}`);
        }

        await tx
          .insert(zones)
          .values({
            name: seed.name,
            code: seed.code,
            description: seed.description ?? null,
            depotLabel: depot.label,
            depotLatitude: depot.latitude,
            depotLongitude: depot.longitude,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: zones.code,
            set: {
              name: seed.name,
              description: seed.description ?? null,
              depotLabel: depot.label,
              depotLatitude: depot.latitude,
              depotLongitude: depot.longitude,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(zones).where(eq(zones.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve zone: ${seed.code}`);
        }

        zoneIds.set(seed.code, row.id);
      }

      for (const seed of USER_SEEDS) {
        const zoneId = seed.zoneCode ? zoneIds.get(seed.zoneCode) ?? null : null;
        await tx
          .update(users)
          .set({
            zoneId,
            updatedAt: now,
          })
          .where(eq(users.email, seed.email));
      }

      const containerTypeIds = new Map<string, string>();
      for (const seed of CONTAINER_TYPE_SEEDS) {
        await tx
          .insert(containerTypes)
          .values({
            code: seed.code,
            label: seed.label,
            wasteStream: seed.wasteStream,
            nominalCapacityLiters: seed.nominalCapacityLiters,
            defaultFillAlertPercent: seed.defaultFillAlertPercent,
            defaultCriticalAlertPercent: seed.defaultCriticalAlertPercent,
            colorCode: seed.colorCode,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: containerTypes.code,
            set: {
              label: seed.label,
              wasteStream: seed.wasteStream,
              nominalCapacityLiters: seed.nominalCapacityLiters,
              defaultFillAlertPercent: seed.defaultFillAlertPercent,
              defaultCriticalAlertPercent: seed.defaultCriticalAlertPercent,
              colorCode: seed.colorCode,
              isActive: true,
              updatedAt: now,
            },
          });

        const [row] = await tx
          .select()
          .from(containerTypes)
          .where(eq(containerTypes.code, seed.code))
          .limit(1);
        if (!row) {
          throw new Error(`Failed to resolve container type: ${seed.code}`);
        }

        containerTypeIds.set(seed.code, row.id);
      }

      const containerIds = new Map<string, string>();
      for (const seed of CONTAINER_SEEDS) {
        const zoneId = zoneIds.get(seed.zoneCode);
        const containerTypeId = containerTypeIds.get(seed.containerTypeCode);
        if (!zoneId) {
          throw new Error(`Zone not found for container ${seed.code}: ${seed.zoneCode}`);
        }
        if (!containerTypeId) {
          throw new Error(`Container type not found for container ${seed.code}: ${seed.containerTypeCode}`);
        }
        if (!seed.latitude || !seed.longitude) {
          throw new Error(`Coordinates missing for container ${seed.code}`);
        }

        await tx
          .insert(containers)
          .values({
            code: seed.code,
            label: seed.label,
            status: seed.status,
            fillLevelPercent: seed.fillLevelPercent,
            fillRatePerHour: seed.fillRatePerHour,
            lastMeasurementAt: seed.lastMeasurementAt,
            lastCollectedAt: seed.lastCollectedAt,
            zoneId,
            containerTypeId,
            latitude: seed.latitude,
            longitude: seed.longitude,
          })
          .onConflictDoUpdate({
            target: containers.code,
            set: {
              label: seed.label,
              status: seed.status,
              fillLevelPercent: seed.fillLevelPercent,
              fillRatePerHour: seed.fillRatePerHour,
              lastMeasurementAt: seed.lastMeasurementAt,
              lastCollectedAt: seed.lastCollectedAt,
              zoneId,
              containerTypeId,
              latitude: seed.latitude,
              longitude: seed.longitude,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(containers).where(eq(containers.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve container: ${seed.code}`);
        }

        containerIds.set(seed.code, row.id);
      }

      const sensorDeviceIds = new Map<string, string>();
      for (const seed of SENSOR_DEVICE_SEEDS) {
        const containerId = containerIds.get(seed.containerCode);
        if (!containerId) {
          throw new Error(`Container not found for sensor device ${seed.deviceUid}: ${seed.containerCode}`);
        }

        await tx
          .insert(sensorDevices)
          .values({
            containerId,
            deviceUid: seed.deviceUid,
            hardwareModel: seed.hardwareModel,
            firmwareVersion: seed.firmwareVersion,
            installStatus: seed.installStatus,
            batteryPercent: seed.batteryPercent,
            lastSeenAt: new Date(seed.lastSeenAt),
            installedAt: new Date(seed.installedAt),
          })
          .onConflictDoUpdate({
            target: sensorDevices.deviceUid,
            set: {
              containerId,
              hardwareModel: seed.hardwareModel,
              firmwareVersion: seed.firmwareVersion,
              installStatus: seed.installStatus,
              batteryPercent: seed.batteryPercent,
              lastSeenAt: new Date(seed.lastSeenAt),
              installedAt: new Date(seed.installedAt),
              updatedAt: now,
            },
          });

        const [row] = await tx
          .select()
          .from(sensorDevices)
          .where(eq(sensorDevices.deviceUid, seed.deviceUid))
          .limit(1);
        if (!row) {
          throw new Error(`Failed to resolve sensor device: ${seed.deviceUid}`);
        }

        sensorDeviceIds.set(seed.deviceUid, row.id);
      }

      for (const seed of MEASUREMENT_SEEDS) {
        const sensorDeviceId = sensorDeviceIds.get(seed.deviceUid);
        const containerId = containerIds.get(seed.containerCode);

        if (!sensorDeviceId || !containerId) {
          throw new Error(`Missing references for measurement seed: ${seed.deviceUid}/${seed.containerCode}`);
        }

        const measuredAt = new Date(seed.measuredAt);
        const [existingMeasurement] = await tx
          .select({
            id: measurements.id,
            measuredAt: measurements.measuredAt,
          })
          .from(measurements)
          .where(and(eq(measurements.sensorDeviceId, sensorDeviceId), eq(measurements.measuredAt, measuredAt)))
          .limit(1);

        if (!existingMeasurement) {
          await tx.insert(measurements).values({
            sensorDeviceId,
            containerId,
            measuredAt,
            fillLevelPercent: seed.fillLevelPercent,
            temperatureC: seed.temperatureC,
            batteryPercent: seed.batteryPercent,
            signalStrength: seed.signalStrength,
            measurementQuality: seed.measurementQuality,
            sourcePayload: {
              source: 'seed',
              deviceUid: seed.deviceUid,
            },
            receivedAt: measuredAt,
          });
        }
      }

      const managedTourNames = Array.from(
        new Set([...TOUR_SEEDS.map((seed) => seed.name), ...LEGACY_TOUR_SEED_NAMES]),
      );
      const managedTourAgentIds = Array.from(
        new Set(
          TOUR_SEEDS.map((seed) => userIds.get(seed.assignedAgentEmail)).filter(
            (agentId): agentId is string => Boolean(agentId),
          ),
        ),
      );
      if (managedTourNames.length > 0 && managedTourAgentIds.length > 0) {
        const staleManagedTours = await tx
          .select({ id: tours.id })
          .from(tours)
          .where(
            and(
              inArray(tours.name, managedTourNames),
              inArray(tours.assignedAgentId, managedTourAgentIds),
            ),
          );

        if (staleManagedTours.length > 0) {
          await tx.delete(tours).where(inArray(tours.id, staleManagedTours.map((tour) => tour.id)));
        }
      }

      const seededTourIds = new Map<string, string>();
      for (const seed of TOUR_SEEDS) {
        const zoneId = zoneIds.get(seed.zoneCode);
        const assignedAgentId = userIds.get(seed.assignedAgentEmail);
        if (!zoneId || !assignedAgentId) {
          throw new Error(`Missing references for tour seed: ${seed.name}`);
        }

        const scheduledFor = new Date(now);
        scheduledFor.setDate(now.getDate() + seed.scheduledForOffsetDays);

        const [tourRow] = await tx
          .insert(tours)
          .values({
            name: seed.name,
            status: seed.status,
            zoneId,
            assignedAgentId,
            scheduledFor,
          })
          .returning({ id: tours.id });

        if (!tourRow) {
          throw new Error(`Failed to resolve tour: ${seed.name}`);
        }

        seededTourIds.set(seed.name, tourRow.id);
        await tx.delete(tourStops).where(eq(tourStops.tourId, tourRow.id));

        for (let index = 0; index < seed.stopContainerCodes.length; index += 1) {
          const containerCode = seed.stopContainerCodes[index];
          const containerId = containerIds.get(containerCode);

          if (!containerId) {
            throw new Error(`Missing container for tour stop: ${containerCode}`);
          }

          await tx.insert(tourStops).values({
            tourId: tourRow.id,
            containerId,
            stopOrder: index + 1,
            status: 'pending',
          });
        }
      }

      for (const seed of CITIZEN_REPORT_SEEDS) {
        const containerId = containerIds.get(seed.containerCode);
        const reporterUserId = userIds.get(seed.reporterEmail);
        const containerSeed = CONTAINER_SEEDS.find((item) => item.code === seed.containerCode);

        if (!containerId || !reporterUserId || !containerSeed) {
          throw new Error(`Missing references for citizen report seed: ${seed.containerCode}`);
        }

        const [existingReport] = await tx
          .select()
          .from(citizenReports)
          .where(
            and(
              eq(citizenReports.containerId, containerId),
              eq(citizenReports.reporterUserId, reporterUserId),
              eq(citizenReports.description, seed.description),
            ),
          )
          .limit(1);

        if (!existingReport) {
          await tx.insert(citizenReports).values({
            containerId,
            containerCodeSnapshot: containerSeed.code,
            containerLabelSnapshot: containerSeed.label,
            reporterUserId,
            status: seed.status,
            description: seed.description,
            latitude: seed.latitude ?? null,
            longitude: seed.longitude ?? null,
          });
        }
      }

      for (const seed of GAMIFICATION_PROFILE_SEEDS) {
        const userId = userIds.get(seed.email);
        if (!userId) {
          throw new Error(`Missing user for gamification profile seed: ${seed.email}`);
        }

        await tx
          .insert(gamificationProfiles)
          .values({
            userId,
            points: seed.points,
            level: seed.level,
            badges: seed.badges,
            challengeProgress: {},
          })
          .onConflictDoUpdate({
            target: gamificationProfiles.userId,
            set: {
              points: seed.points,
              level: seed.level,
              badges: seed.badges,
              updatedAt: now,
            },
          });
      }

      const challengeIds = new Map<string, string>();
      for (const seed of CHALLENGE_SEEDS) {
        await tx
          .insert(challenges)
          .values({
            code: seed.code,
            title: seed.title,
            description: seed.description,
            targetValue: seed.targetValue,
            rewardPoints: seed.rewardPoints,
            status: seed.status,
          })
          .onConflictDoUpdate({
            target: challenges.code,
            set: {
              title: seed.title,
              description: seed.description,
              targetValue: seed.targetValue,
              rewardPoints: seed.rewardPoints,
              status: seed.status,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(challenges).where(eq(challenges.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve challenge: ${seed.code}`);
        }

        challengeIds.set(seed.code, row.id);
      }

      for (const seed of CHALLENGE_PARTICIPATION_SEEDS) {
        const challengeId = challengeIds.get(seed.challengeCode);
        const userId = userIds.get(seed.userEmail);

        if (!challengeId || !userId) {
          throw new Error(
            `Missing references for challenge participation seed: ${seed.challengeCode}/${seed.userEmail}`,
          );
        }

        const [existingParticipation] = await tx
          .select()
          .from(challengeParticipations)
          .where(
            and(
              eq(challengeParticipations.challengeId, challengeId),
              eq(challengeParticipations.userId, userId),
            ),
          )
          .limit(1);

        if (existingParticipation) {
          await tx
            .update(challengeParticipations)
            .set({
              progress: seed.progress,
              status: seed.status,
              updatedAt: now,
            })
            .where(eq(challengeParticipations.id, existingParticipation.id));
        } else {
          await tx.insert(challengeParticipations).values({
            challengeId,
            userId,
            progress: seed.progress,
            status: seed.status,
          });
        }
      }

      const anomalyTypeIds = new Map<string, string>();
      for (const seed of ANOMALY_TYPE_SEEDS) {
        await tx
          .insert(anomalyTypes)
          .values({
            code: seed.code,
            label: seed.label,
            description: seed.description,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: anomalyTypes.code,
            set: {
              label: seed.label,
              description: seed.description,
              isActive: true,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(anomalyTypes).where(eq(anomalyTypes.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve anomaly type: ${seed.code}`);
        }

        anomalyTypeIds.set(seed.code, row.id);
      }

      for (const seed of ANOMALY_REPORT_SEEDS) {
        const anomalyTypeId = anomalyTypeIds.get(seed.anomalyTypeCode);
        const reporterUserId = userIds.get(seed.reporterEmail);
        const seededTourId = seededTourIds.get(seed.tourName);
        const [tourRow] = seededTourId
          ? await tx.select().from(tours).where(eq(tours.id, seededTourId)).limit(1)
          : await tx.select().from(tours).where(eq(tours.name, seed.tourName)).limit(1);
        const [stopRow] = tourRow
          ? await tx
              .select()
              .from(tourStops)
              .where(and(eq(tourStops.tourId, tourRow.id), eq(tourStops.stopOrder, seed.stopOrder)))
              .limit(1)
          : [];

        if (!anomalyTypeId || !reporterUserId || !tourRow || !stopRow) {
          throw new Error(`Missing references for anomaly report seed: ${seed.anomalyTypeCode}`);
        }

        const [existingReport] = await tx
          .select()
          .from(anomalyReports)
          .where(
            and(
              eq(anomalyReports.anomalyTypeId, anomalyTypeId),
              eq(anomalyReports.tourStopId, stopRow.id),
              eq(anomalyReports.reporterUserId, reporterUserId),
            ),
          )
          .limit(1);

        if (existingReport) {
          await tx
            .update(anomalyReports)
            .set({
              comments: seed.comments,
              photoUrl: seed.photoUrl ?? null,
              severity: seed.severity,
              updatedAt: now,
            })
            .where(eq(anomalyReports.id, existingReport.id));
        } else {
          await tx.insert(anomalyReports).values({
            anomalyTypeId,
            tourId: tourRow.id,
            tourStopId: stopRow.id,
            reporterUserId,
            comments: seed.comments,
            photoUrl: seed.photoUrl ?? null,
            severity: seed.severity,
            status: 'reported',
          });
        }
      }

      const primarySeedTourId = TOUR_SEEDS[0] ? seededTourIds.get(TOUR_SEEDS[0].name) : null;
      const [firstTourStop] = primarySeedTourId
        ? await tx
            .select()
            .from(tourStops)
            .where(eq(tourStops.tourId, primarySeedTourId))
            .orderBy(asc(tourStops.stopOrder))
            .limit(1)
        : [];
      if (firstTourStop) {
        const [existingCollectionEvent] = await tx
          .select()
          .from(collectionEvents)
          .where(eq(collectionEvents.tourStopId, firstTourStop.id))
          .limit(1);

        if (!existingCollectionEvent) {
          await tx.insert(collectionEvents).values({
            tourStopId: firstTourStop.id,
            containerId: firstTourStop.containerId,
            actorUserId: userIds.get('agent@example.com') ?? null,
            volumeLiters: 120,
            notes: 'Seeded initial collection event',
          });
        }
      }

      const alertRuleIds = new Map<string, string>();
      for (const seed of ALERT_RULE_SEEDS) {
        const matchingRules = await tx
          .select()
          .from(alertRules)
          .where(eq(alertRules.scopeType, seed.scopeType));
        const existingRule = matchingRules.find(
          (row) =>
            (row.scopeKey ?? null) === (seed.scopeKey ?? null) &&
            (row.recipientRole ?? null) === (seed.recipientRole ?? null),
        );

        if (existingRule) {
          const [updatedRule] = await tx
            .update(alertRules)
            .set({
              warningFillPercent: seed.warningFillPercent ?? null,
              criticalFillPercent: seed.criticalFillPercent ?? null,
              anomalyTypeCode: seed.anomalyTypeCode ?? null,
              notifyChannels: seed.notifyChannels,
              isActive: seed.isActive,
              updatedAt: now,
            })
            .where(eq(alertRules.id, existingRule.id))
            .returning();

          if (!updatedRule) {
            throw new Error(`Failed to update alert rule: ${seed.scopeType}/${seed.scopeKey ?? 'global'}`);
          }

          alertRuleIds.set(`${seed.scopeType}:${seed.scopeKey ?? 'global'}`, updatedRule.id);
          continue;
        }

        const [createdRule] = await tx
          .insert(alertRules)
          .values({
            scopeType: seed.scopeType,
            scopeKey: seed.scopeKey ?? null,
            warningFillPercent: seed.warningFillPercent ?? null,
            criticalFillPercent: seed.criticalFillPercent ?? null,
            anomalyTypeCode: seed.anomalyTypeCode ?? null,
            notifyChannels: seed.notifyChannels,
            recipientRole: seed.recipientRole ?? null,
            isActive: seed.isActive,
          })
          .returning();

        if (!createdRule) {
          throw new Error(`Failed to create alert rule: ${seed.scopeType}/${seed.scopeKey ?? 'global'}`);
        }

        alertRuleIds.set(`${seed.scopeType}:${seed.scopeKey ?? 'global'}`, createdRule.id);
      }

      for (const seed of ALERT_EVENT_SEEDS) {
        const containerId = seed.containerCode ? containerIds.get(seed.containerCode) ?? null : null;
        const zoneId = seed.zoneCode ? zoneIds.get(seed.zoneCode) ?? null : null;
        const acknowledgedByUserId = seed.acknowledgedByEmail ? userIds.get(seed.acknowledgedByEmail) ?? null : null;
        const ruleId =
          seed.ruleScopeType != null
            ? alertRuleIds.get(`${seed.ruleScopeType}:${seed.ruleScopeKey ?? 'global'}`) ?? null
            : null;

        const matchingEvents = await tx
          .select()
          .from(alertEvents)
          .where(eq(alertEvents.eventType, seed.eventType));
        const existingEvent = matchingEvents.find(
          (row) =>
            (row.containerId ?? null) === containerId &&
            row.currentStatus === seed.currentStatus,
        );

        if (existingEvent) {
          const [updatedEvent] = await tx
            .update(alertEvents)
            .set({
              ruleId,
              zoneId,
              severity: seed.severity,
              acknowledgedByUserId,
              payloadSnapshot: seed.payloadSnapshot,
            })
            .where(eq(alertEvents.id, existingEvent.id))
            .returning();

          if (!updatedEvent) {
            throw new Error(`Failed to update alert event: ${seed.eventType}`);
          }

          continue;
        }

        const [createdEvent] = await tx
          .insert(alertEvents)
          .values({
            ruleId,
            containerId,
            zoneId,
            eventType: seed.eventType,
            severity: seed.severity,
            triggeredAt: now,
            currentStatus: seed.currentStatus,
            acknowledgedByUserId,
            payloadSnapshot: seed.payloadSnapshot,
          })
          .returning();

        if (!createdEvent) {
          throw new Error(`Failed to create alert event: ${seed.eventType}`);
        }

      }

      for (const seed of NOTIFICATION_SEEDS) {
        const [existingNotification] = await tx
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.eventType, seed.eventType),
              eq(notifications.entityType, seed.entityType),
              eq(notifications.entityId, seed.entityId),
            ),
          )
          .limit(1);

        const notification =
          existingNotification
            ? (
                await tx
                  .update(notifications)
                  .set({
                    audienceScope: seed.audienceScope,
                    title: seed.title,
                    body: seed.body,
                    preferredChannels: seed.preferredChannels,
                    status: seed.status,
                  })
                  .where(eq(notifications.id, existingNotification.id))
                  .returning()
              )[0]
            : (
                await tx
                  .insert(notifications)
                  .values({
                    eventType: seed.eventType,
                    entityType: seed.entityType,
                    entityId: seed.entityId,
                    audienceScope: seed.audienceScope,
                    title: seed.title,
                    body: seed.body,
                    preferredChannels: seed.preferredChannels,
                    status: seed.status,
                    scheduledAt: now,
                  })
                  .returning()
              )[0];

        if (!notification) {
          throw new Error(`Failed to resolve notification seed: ${seed.eventType}`);
        }

        for (const delivery of seed.deliveries) {
          const [existingDelivery] = await tx
            .select()
            .from(notificationDeliveries)
            .where(
              and(
                eq(notificationDeliveries.notificationId, notification.id),
                eq(notificationDeliveries.channel, delivery.channel),
                eq(notificationDeliveries.recipientAddress, delivery.recipientAddress),
              ),
            )
            .limit(1);

          if (existingDelivery) {
            await tx
              .update(notificationDeliveries)
              .set({
                deliveryStatus: delivery.deliveryStatus,
                attemptCount: delivery.attemptCount,
                lastAttemptAt: now,
                deliveredAt: delivery.deliveryStatus === 'delivered' ? now : null,
                errorCode: delivery.deliveryStatus === 'failed' ? 'seed_failure' : null,
              })
              .where(eq(notificationDeliveries.id, existingDelivery.id));
            continue;
          }

          await tx.insert(notificationDeliveries).values({
            notificationId: notification.id,
            channel: delivery.channel,
            recipientAddress: delivery.recipientAddress,
            deliveryStatus: delivery.deliveryStatus,
            attemptCount: delivery.attemptCount,
            lastAttemptAt: now,
            deliveredAt: delivery.deliveryStatus === 'delivered' ? now : null,
            errorCode: delivery.deliveryStatus === 'failed' ? 'seed_failure' : null,
          });
        }
      }

      const zoneDepotById = new Map(
        Array.from(zoneIds.entries())
          .map(([zoneCode, zoneId]) => {
            const depot = ZONE_DEPOT_SEEDS.get(zoneCode);
            return depot ? [zoneId, depot] : null;
          })
          .filter((entry): entry is [string, ZoneDepotSeed] => entry != null),
      );

      const allTours = await tx.select({ id: tours.id, zoneId: tours.zoneId }).from(tours);
      for (const tourRow of allTours) {
        const persistedStops = await tx
          .select({
            stopOrder: tourStops.stopOrder,
            latitude: containers.latitude,
            longitude: containers.longitude,
          })
          .from(tourStops)
          .innerJoin(containers, eq(tourStops.containerId, containers.id))
          .where(eq(tourStops.tourId, tourRow.id))
          .orderBy(asc(tourStops.stopOrder));

        const persistedRoute = buildPersistedRouteSeed(
          persistedStops,
          tourRow.zoneId ? zoneDepotById.get(tourRow.zoneId) ?? null : null,
        );
        if (!persistedRoute) {
          await tx.delete(tourRoutes).where(eq(tourRoutes.tourId, tourRow.id));
          continue;
        }

        await tx
          .insert(tourRoutes)
          .values({
            tourId: tourRow.id,
            geometry: persistedRoute.geometry,
            distanceMeters: persistedRoute.distanceMeters,
            durationMinutes: persistedRoute.durationMinutes,
            source: persistedRoute.source,
            provider: persistedRoute.provider,
            resolvedAt: now,
          })
          .onConflictDoUpdate({
            target: tourRoutes.tourId,
            set: {
              geometry: persistedRoute.geometry,
              distanceMeters: persistedRoute.distanceMeters,
              durationMinutes: persistedRoute.durationMinutes,
              source: persistedRoute.source,
              provider: persistedRoute.provider,
              resolvedAt: now,
              updatedAt: now,
            },
          });
      }
    });
  } finally {
    await dispose();
  }
}

