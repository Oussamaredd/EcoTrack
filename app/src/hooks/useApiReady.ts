import { useEffect, useMemo, useState } from 'react';

const API_READY_RETRY_DELAY_MS = 1200;
const API_READY_TIMEOUT_MS = 1500;
const FALLBACK_API_BASE = 'http://localhost:3001';

export type ApiReachability = 'checking' | 'ready' | 'degraded';

const normalizeApiBaseUrl = (apiBaseUrl: string) => {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
      const origin = window.location.origin.trim();
      if (origin.length > 0) {
        return origin;
      }
    }

    return FALLBACK_API_BASE;
  }

  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

export const probeApiHealth = async (
  apiBaseUrl: string,
  options: { timeoutMs?: number } = {},
) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? API_READY_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const useApiReady = (apiBaseUrl: string) => {
  const [isApiReady, setIsApiReady] = useState(false);
  const [apiReachability, setApiReachability] = useState<ApiReachability>('checking');
  const healthUrl = useMemo(() => `${normalizeApiBaseUrl(apiBaseUrl)}/health`, [apiBaseUrl]);

  const runProbe = async () => {
    const isHealthy = await probeApiHealth(apiBaseUrl);
    setIsApiReady(isHealthy);
    setApiReachability(isHealthy ? 'ready' : 'degraded');
    return isHealthy;
  };

  useEffect(() => {
    let isActive = true;
    let bootstrapTimer: number | null = null;
    let retryTimer: number | null = null;

    const probe = async ({ scheduleRetry = true }: { scheduleRetry?: boolean } = {}) => {
      if (!isActive) {
        return false;
      }

      const isHealthy = await runProbe();

      if (!isActive) {
        return false;
      }

      if (!isHealthy && scheduleRetry) {
        retryTimer = window.setTimeout(() => {
          void probe();
        }, API_READY_RETRY_DELAY_MS);
      }

      return isHealthy;
    };

    bootstrapTimer = window.setTimeout(() => {
      setIsApiReady(false);
      setApiReachability('checking');
      void probe();
    }, 0);

    return () => {
      isActive = false;
      if (bootstrapTimer !== null) {
        window.clearTimeout(bootstrapTimer);
      }
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [healthUrl]);

  return {
    isApiReady,
    apiReachability,
    healthUrl,
    retry: runProbe,
  };
};
