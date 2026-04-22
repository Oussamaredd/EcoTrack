const FIVE_MINUTES_MS = 5 * 60 * 1000;

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const DEFAULT_PLANNING_REALTIME_CONFIG = {
  sseEnabled: false,
  websocketEnabled: true,
  messageIntervalMs: FIVE_MINUTES_MS,
} as const;

export const DEFAULT_RUNTIME_FEATURE_FLAGS = {
  adminWorkspaceEnabled: false,
  billingEnabled: false,
  citizenChallengesEnabled: false,
  planningReportsEnabled: false,
} as const;

export type PlanningRealtimeConfig = {
  sseEnabled: boolean;
  websocketEnabled: boolean;
  messageIntervalMs: number;
};

export type RuntimeFeatureFlags = {
  adminWorkspaceEnabled: boolean;
  billingEnabled: boolean;
  citizenChallengesEnabled: boolean;
  planningReportsEnabled: boolean;
};

export const loadPlanningRealtimeConfig = (
  env: Record<string, unknown>,
): PlanningRealtimeConfig => ({
  sseEnabled: parseBoolean(
    env.PLANNING_SSE_ENABLED,
    DEFAULT_PLANNING_REALTIME_CONFIG.sseEnabled,
  ),
  websocketEnabled: parseBoolean(
    env.PLANNING_WEBSOCKET_ENABLED,
    DEFAULT_PLANNING_REALTIME_CONFIG.websocketEnabled,
  ),
  messageIntervalMs: parsePositiveInt(
    env.PLANNING_REALTIME_INTERVAL_MS,
    DEFAULT_PLANNING_REALTIME_CONFIG.messageIntervalMs,
  ),
});

export const loadRuntimeFeatureFlags = (
  env: Record<string, unknown>,
): RuntimeFeatureFlags => ({
  adminWorkspaceEnabled: parseBoolean(
    env.ADMIN_WORKSPACE_ENABLED,
    DEFAULT_RUNTIME_FEATURE_FLAGS.adminWorkspaceEnabled,
  ),
  billingEnabled: parseBoolean(env.BILLING_ENABLED, DEFAULT_RUNTIME_FEATURE_FLAGS.billingEnabled),
  citizenChallengesEnabled: parseBoolean(
    env.CITIZEN_CHALLENGES_ENABLED,
    DEFAULT_RUNTIME_FEATURE_FLAGS.citizenChallengesEnabled,
  ),
  planningReportsEnabled: parseBoolean(
    env.PLANNING_REPORTS_ENABLED,
    DEFAULT_RUNTIME_FEATURE_FLAGS.planningReportsEnabled,
  ),
});
