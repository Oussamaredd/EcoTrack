const FIVE_MINUTES_MS = 5 * 60 * 1000;

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return fallback;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readRuntimeEnv = () => import.meta.env as Record<string, string | undefined>;

export const DEFAULT_APP_RUNTIME_CONFIG = {
  adminWorkspaceEnabled: false,
  apiTelemetryEnabled: false,
  citizenChallengesEnabled: false,
  dashboardRefreshIntervalMs: FIVE_MINUTES_MS,
  managerReportsEnabled: false,
  planningRefreshIntervalMs: FIVE_MINUTES_MS,
  planningSseEnabled: false,
  planningWebsocketEnabled: true,
} as const;

export type AppRuntimeConfig = {
  adminWorkspaceEnabled: boolean;
  apiTelemetryEnabled: boolean;
  citizenChallengesEnabled: boolean;
  dashboardRefreshIntervalMs: number;
  managerReportsEnabled: boolean;
  planningRefreshIntervalMs: number;
  planningSseEnabled: boolean;
  planningWebsocketEnabled: boolean;
};

export const loadAppRuntimeConfig = (): AppRuntimeConfig => {
  const env = readRuntimeEnv();

  return {
    adminWorkspaceEnabled: parseBoolean(
      env.VITE_ADMIN_WORKSPACE_ENABLED,
      DEFAULT_APP_RUNTIME_CONFIG.adminWorkspaceEnabled,
    ),
    apiTelemetryEnabled: parseBoolean(
      env.VITE_API_TELEMETRY_ENABLED,
      DEFAULT_APP_RUNTIME_CONFIG.apiTelemetryEnabled,
    ),
    citizenChallengesEnabled: parseBoolean(
      env.VITE_CITIZEN_CHALLENGES_ENABLED,
      DEFAULT_APP_RUNTIME_CONFIG.citizenChallengesEnabled,
    ),
    dashboardRefreshIntervalMs: parsePositiveInt(
      env.VITE_DASHBOARD_REFRESH_INTERVAL_MS,
      DEFAULT_APP_RUNTIME_CONFIG.dashboardRefreshIntervalMs,
    ),
    managerReportsEnabled: parseBoolean(
      env.VITE_MANAGER_REPORTS_ENABLED,
      DEFAULT_APP_RUNTIME_CONFIG.managerReportsEnabled,
    ),
    planningRefreshIntervalMs: parsePositiveInt(
      env.VITE_PLANNING_REFRESH_INTERVAL_MS,
      DEFAULT_APP_RUNTIME_CONFIG.planningRefreshIntervalMs,
    ),
    planningSseEnabled: parseBoolean(
      env.VITE_PLANNING_SSE_ENABLED,
      DEFAULT_APP_RUNTIME_CONFIG.planningSseEnabled,
    ),
    planningWebsocketEnabled: parseBoolean(
      env.VITE_PLANNING_WEBSOCKET_ENABLED,
      DEFAULT_APP_RUNTIME_CONFIG.planningWebsocketEnabled,
    ),
  };
};

export const isFeatureRouteEnabled = (
  route: string,
  runtimeConfig: AppRuntimeConfig = loadAppRuntimeConfig(),
) => {
  if (route === "/app/admin" || route.startsWith("/app/admin/")) {
    return runtimeConfig.adminWorkspaceEnabled;
  }

  if (route === "/app/citizen/challenges" || route.startsWith("/app/citizen/challenges/")) {
    return runtimeConfig.citizenChallengesEnabled;
  }

  if (route === "/app/manager/reports" || route.startsWith("/app/manager/reports/")) {
    return runtimeConfig.managerReportsEnabled;
  }

  return true;
};
