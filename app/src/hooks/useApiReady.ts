import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { resolveApiBase } from '../lib/apiBase';

const API_READY_RETRY_DELAYS_MS = [750, 2000, 5000, 10000];
const API_READY_STEADY_RETRY_DELAY_MS = 15000;
const API_READY_TIMEOUT_MS = 2500;
const API_READY_PATH = '/api/health/ready';
const EXPECTED_NOT_READY_HTTP_STATUSES = new Set([500, 502, 503, 504]);

export type ApiReachability = 'checking' | 'ready' | 'degraded';

type ApiReadySnapshot = {
  isApiReady: boolean;
  apiReachability: ApiReachability;
  healthUrl: string;
};

type ApiReadinessStore = {
  apiBaseUrl: string;
  bootstrapTimer: number | null;
  healthUrl: string;
  inFlightProbe: Promise<boolean> | null;
  isStarted: boolean;
  listeners: Set<() => void>;
  retryAttemptCount: number;
  retryTimer: number | null;
  state: ApiReadySnapshot;
};

const readinessStores = new Map<string, ApiReadinessStore>();
const storeStopHandlers = new WeakMap<ApiReadinessStore, () => void>();

const getRetryDelayMs = (attemptCount: number) =>
  API_READY_RETRY_DELAYS_MS[attemptCount] ?? API_READY_STEADY_RETRY_DELAY_MS;

const isExpectedReadinessNotReadyStatus = (status: number) =>
  EXPECTED_NOT_READY_HTTP_STATUSES.has(status);

const resolveReadinessApiBase = (apiBaseUrl: string) =>
  resolveApiBase({
    configuredApiBase: apiBaseUrl,
  });

const createApiReadySnapshot = (
  apiBaseUrl: string,
  apiReachability: ApiReachability = 'checking',
): ApiReadySnapshot => ({
  apiReachability,
  healthUrl: `${apiBaseUrl}${API_READY_PATH}`,
  isApiReady: apiReachability === 'ready',
});

const notifyStoreListeners = (store: ApiReadinessStore) => {
  for (const listener of store.listeners) {
    listener();
  }
};

const setStoreState = (
  store: ApiReadinessStore,
  apiReachability: ApiReachability,
) => {
  const nextState = createApiReadySnapshot(store.apiBaseUrl, apiReachability);
  if (
    store.state.apiReachability === nextState.apiReachability &&
    store.state.isApiReady === nextState.isApiReady &&
    store.state.healthUrl === nextState.healthUrl
  ) {
    return;
  }

  store.state = nextState;
  notifyStoreListeners(store);
};

const clearBootstrapTimer = (store: ApiReadinessStore) => {
  if (store.bootstrapTimer !== null) {
    window.clearTimeout(store.bootstrapTimer);
    store.bootstrapTimer = null;
  }
};

const clearRetryTimer = (store: ApiReadinessStore) => {
  if (store.retryTimer !== null) {
    window.clearTimeout(store.retryTimer);
    store.retryTimer = null;
  }
};

export const probeApiHealth = async (
  apiBaseUrl: string,
  options: { timeoutMs?: number } = {},
) => {
  const resolvedApiBase = resolveReadinessApiBase(apiBaseUrl);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? API_READY_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${resolvedApiBase}${API_READY_PATH}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.ok) {
      return true;
    }

    if (isExpectedReadinessNotReadyStatus(response.status)) {
      return false;
    }

    return false;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const scheduleStoreRetry = (store: ApiReadinessStore) => {
  if (store.listeners.size === 0) {
    return;
  }

  const retryDelayMs = getRetryDelayMs(store.retryAttemptCount);
  store.retryAttemptCount += 1;
  clearRetryTimer(store);
  store.retryTimer = window.setTimeout(() => {
    void runStoreProbe(store);
  }, retryDelayMs);
};

const runStoreProbe = (
  store: ApiReadinessStore,
  options: { scheduleRetry?: boolean; setChecking?: boolean } = {},
) => {
  const { scheduleRetry = true, setChecking = false } = options;

  if (setChecking && !store.state.isApiReady) {
    setStoreState(store, 'checking');
  }

  if (store.inFlightProbe) {
    return store.inFlightProbe;
  }

  store.inFlightProbe = (async () => {
    const isHealthy = await probeApiHealth(store.apiBaseUrl);
    store.inFlightProbe = null;

    if (isHealthy) {
      store.retryAttemptCount = 0;
      clearRetryTimer(store);
      setStoreState(store, 'ready');
      return true;
    }

    setStoreState(store, 'degraded');
    if (scheduleRetry) {
      scheduleStoreRetry(store);
    }

    return false;
  })();

  return store.inFlightProbe;
};

const reprobeStoreSoon = (store: ApiReadinessStore) => {
  if (!store.isStarted) {
    return;
  }

  store.retryAttemptCount = 0;
  clearRetryTimer(store);
  void runStoreProbe(store, { setChecking: true });
};

const getApiReadinessStore = (apiBaseUrl: string) => {
  const resolvedApiBase = resolveReadinessApiBase(apiBaseUrl);
  const existingStore = readinessStores.get(resolvedApiBase);
  if (existingStore) {
    return existingStore;
  }

  const store: ApiReadinessStore = {
    apiBaseUrl: resolvedApiBase,
    bootstrapTimer: null,
    healthUrl: `${resolvedApiBase}${API_READY_PATH}`,
    inFlightProbe: null,
    isStarted: false,
    listeners: new Set(),
    retryAttemptCount: 0,
    retryTimer: null,
    state: createApiReadySnapshot(resolvedApiBase),
  };

  readinessStores.set(resolvedApiBase, store);
  return store;
};

const startStore = (store: ApiReadinessStore) => {
  if (store.isStarted || typeof window === 'undefined') {
    return;
  }

  store.isStarted = true;
  store.retryAttemptCount = 0;
  setStoreState(store, 'checking');

  const handleOnline = () => reprobeStoreSoon(store);
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      reprobeStoreSoon(store);
    }
  };

  store.bootstrapTimer = window.setTimeout(() => {
    store.bootstrapTimer = null;
    void runStoreProbe(store);
  }, 0);

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  storeStopHandlers.set(store, () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
};

const stopStore = (store: ApiReadinessStore) => {
  if (!store.isStarted) {
    return;
  }

  store.isStarted = false;
  clearBootstrapTimer(store);
  clearRetryTimer(store);
  storeStopHandlers.get(store)?.();
  storeStopHandlers.delete(store);
};

const subscribeToStore = (store: ApiReadinessStore, listener: () => void) => {
  store.listeners.add(listener);
  startStore(store);

  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0) {
      stopStore(store);
    }
  };
};

const retryStoreNow = (store: ApiReadinessStore) => {
  store.retryAttemptCount = 0;
  clearRetryTimer(store);
  return runStoreProbe(store, { setChecking: true });
};

export const resetApiReadyStoresForTests = () => {
  for (const store of readinessStores.values()) {
    stopStore(store);
  }

  readinessStores.clear();
};

export const useApiReady = (apiBaseUrl: string) => {
  const resolvedApiBase = useMemo(() => resolveReadinessApiBase(apiBaseUrl), [apiBaseUrl]);
  const store = useMemo(() => getApiReadinessStore(resolvedApiBase), [resolvedApiBase]);
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToStore(store, onStoreChange),
    [store],
  );
  const getSnapshot = useCallback(() => store.state, [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const retry = useCallback(() => {
    return retryStoreNow(store);
  }, [store]);

  return {
    ...snapshot,
    retry,
  };
};
