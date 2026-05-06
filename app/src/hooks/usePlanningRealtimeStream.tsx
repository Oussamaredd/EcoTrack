import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { loadAppRuntimeConfig } from '../config/runtimeFeatures';
import {
  ApiRequestError,
  buildApiUrl,
  createApiHeaders,
  createApiRequestError,
  getApiCredentialsMode,
} from '../services/api';
import { queryKeys } from '../state/queryKeys';
import { reportRealtimeTransportError } from '../utils/errorHandlers';

type PlanningStreamState = 'connected' | 'reconnecting' | 'fallback' | 'disabled';

const BASE_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 3;
const STREAM_SESSION_ENDPOINTS = ['/api/planning/stream/session', '/api/planning/stream-session'];

class StreamSessionRequestError extends Error {
  constructor(readonly status: number) {
    super(`Unable to issue stream session token (HTTP ${status})`);
  }
}

type StreamSessionPayload = {
  sessionToken?: string;
  streamSessionToken?: string;
  token?: string;
};

const toStreamUrl = (sessionToken: string, lastEventId: string | null) => {
  const streamUrl = new URL(buildApiUrl('/api/planning/stream'));
  streamUrl.searchParams.set('stream_session', sessionToken);

  if (lastEventId) {
    streamUrl.searchParams.set('last_event_id', lastEventId);
  }

  return streamUrl.toString();
};

const requestStreamSessionToken = async () => {
  for (const endpoint of STREAM_SESSION_ENDPOINTS) {
    const requestUrl = buildApiUrl(endpoint);
    const response = await fetch(requestUrl, {
      method: 'POST',
      credentials: getApiCredentialsMode(requestUrl),
      headers: createApiHeaders(),
    });

    if (response.status === 404) {
      continue;
    }

    if (response.status === 401) {
      throw await createApiRequestError(response);
    }

    if (!response.ok) {
      throw new StreamSessionRequestError(response.status);
    }

    const payload = (await response.json()) as StreamSessionPayload;
    const sessionToken = payload.sessionToken ?? payload.streamSessionToken ?? payload.token;

    if (sessionToken) {
      return sessionToken;
    }
  }

  throw new Error('Missing stream session token');
};

const applyDashboardSnapshot = (
  queryClient: ReturnType<typeof useQueryClient>,
  payload?: Record<string, unknown>,
) => {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  queryClient.setQueryData(queryKeys.planningDashboard, (currentValue: unknown) => {
    const currentData =
      currentValue && typeof currentValue === 'object' ? (currentValue as Record<string, unknown>) : {};

    return {
      ...currentData,
      ...payload,
    };
  });
};

const readEventPayload = (event: Event) => {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(event.data);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
};

export const usePlanningRealtimeStream = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const { planningSseEnabled } = loadAppRuntimeConfig();
  const isEventSourceSupported =
    typeof window !== 'undefined' && typeof window.EventSource !== 'undefined';

  const [connectionState, setConnectionState] = useState<PlanningStreamState>('reconnecting');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !planningSseEnabled || !isEventSourceSupported) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let isCancelled = false;
    let lastEventId: string | null = null;

    const handleDashboardSnapshot = (payload?: Record<string, unknown>) => {
      setLastEventAt(Date.now());
      applyDashboardSnapshot(queryClient, payload);
    };

    const invalidateAgentTour = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentTour });
    };

    const invalidatePlanningHeatmap = () => {
      setLastEventAt(Date.now());
      queryClient.invalidateQueries({ queryKey: queryKeys.planningHeatmap() });
    };

    const closeStream = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const scheduleReconnect = () => {
      closeStream();

      if (isCancelled) {
        return;
      }

      reconnectAttempts += 1;
      if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        setConnectionState('fallback');
        return;
      }

      setConnectionState('reconnecting');
      const reconnectDelay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempts - 1),
        MAX_RECONNECT_DELAY_MS,
      );

      reconnectTimer = window.setTimeout(() => {
        void connect();
      }, reconnectDelay);
    };

    const connect = async () => {
      if (isCancelled) {
        return;
      }

      try {
        const streamSessionToken = await requestStreamSessionToken();
        if (isCancelled) {
          return;
        }

        const streamUrl = toStreamUrl(streamSessionToken, lastEventId);
        eventSource = new window.EventSource(streamUrl, {
          withCredentials: getApiCredentialsMode(streamUrl) === 'include',
        });
      } catch (error) {
        reportRealtimeTransportError(error, 'planning.realtime.stream.session');
        if (error instanceof ApiRequestError && error.status === 401) {
          setConnectionState('fallback');
          return;
        }

        if (
          error instanceof StreamSessionRequestError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408 &&
          error.status !== 429
        ) {
          setConnectionState('fallback');
          return;
        }

        scheduleReconnect();
        return;
      }

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        setConnectionState('connected');
      };

      eventSource.onerror = () => {
        reportRealtimeTransportError(new Error('EventSource error'), 'planning.realtime.stream.connection');
        scheduleReconnect();
      };

      const trackLastEventId = (event: Event) => {
        const messageEvent = event as MessageEvent;
        if (typeof messageEvent.lastEventId === 'string' && messageEvent.lastEventId.length > 0) {
          lastEventId = messageEvent.lastEventId;
        }
      };

      eventSource.addEventListener('planning.dashboard.snapshot', (event) => {
        trackLastEventId(event);
        handleDashboardSnapshot(readEventPayload(event));
      });
      eventSource.addEventListener('planning.container.critical', (event) => {
        trackLastEventId(event);
        invalidatePlanningHeatmap();
      });
      eventSource.addEventListener('planning.emergency.created', (event) => {
        trackLastEventId(event);
        invalidatePlanningHeatmap();
        invalidateAgentTour();
      });
      eventSource.addEventListener('planning.tour.updated', (event) => {
        trackLastEventId(event);
        invalidateAgentTour();
      });
      eventSource.addEventListener('system.keepalive', (event) => {
        trackLastEventId(event);
        setLastEventAt(Date.now());
      });
    };

    void connect();

    return () => {
      isCancelled = true;
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
      }
      closeStream();
    };
  }, [enabled, isEventSourceSupported, planningSseEnabled, queryClient]);

  const resolvedConnectionState = !enabled || !planningSseEnabled
    ? 'disabled'
    : !isEventSourceSupported
      ? 'fallback'
      : connectionState;

  return useMemo(
    () => ({
      connectionState: resolvedConnectionState,
      lastEventAt,
      isConnected: resolvedConnectionState === 'connected',
    }),
    [lastEventAt, resolvedConnectionState],
  );
};
