// API client with centralized configuration and error handling
import { loadAppRuntimeConfig } from '../config/runtimeFeatures';
import { clearAccessToken, isAccessTokenHeaderSafe, setAccessToken, withAuthHeader } from './authToken';
import { resolveApiBase } from '../lib/apiBase';
import { supabase } from './supabase';

const EDGE_PROXY_ENABLED = import.meta.env.VITE_USE_EDGE_API_PROXY === 'true';

const configuredApiBase =
  import.meta.env.VITE_API_BASE_URL ??
  // Temporary alias support during migration to VITE_API_BASE_URL.
  import.meta.env.VITE_API_URL;

export const API_BASE = resolveApiBase({
  configuredApiBase,
  edgeProxyEnabled: EDGE_PROXY_ENABLED,
});

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const resolveRequestInputUrl = (input: RequestInfo | URL) => {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }

  return String(input);
};

export const resolveApiCredentialsMode = (_options: {
  requestUrl: string;
  windowOrigin?: string | null;
}): RequestCredentials => 'omit';

export const getApiCredentialsMode = (input: RequestInfo | URL) =>
  resolveApiCredentialsMode({ requestUrl: resolveRequestInputUrl(input) });

const ensureConnectionHint = (rel: 'dns-prefetch' | 'preconnect', href: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (rel === 'preconnect') {
    link.crossOrigin = '';
  }
  document.head.appendChild(link);
};

const addApiConnectionHints = (apiBase: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const apiOrigin = normalizeOrigin(apiBase);
  const currentOrigin = normalizeOrigin(window.location.origin);
  if (!apiOrigin || !currentOrigin || apiOrigin === currentOrigin) {
    return;
  }

  ensureConnectionHint('dns-prefetch', apiOrigin);
  ensureConnectionHint('preconnect', apiOrigin);
};

if (typeof window !== 'undefined') {
  addApiConnectionHints(API_BASE);
}

export const AUTH_SESSION_INVALIDATED_EVENT = 'ecotrack:auth-session-invalidated';
const FRONTEND_ERROR_ENDPOINT = '/api/errors';
const FRONTEND_METRIC_ENDPOINT = '/api/metrics/frontend';
const FRONTEND_RELEASE = import.meta.env.VITE_RELEASE_VERSION ?? null;
const FRONTEND_ENVIRONMENT = import.meta.env.MODE;

const captureWebExceptionAsync = (
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>,
) => {
  void import('../monitoring/sentry').then(({ captureWebException }) => {
    captureWebException(error, context, metadata);
  });
};

const captureWebMessageAsync = (
  message: string,
  context: string,
  metadata?: Record<string, unknown>,
) => {
  void import('../monitoring/sentry').then(({ captureWebMessage }) => {
    captureWebMessage(message, context, metadata);
  });
};

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

type FrontendErrorPayload = {
  type: string;
  message: string;
  context?: string;
  severity?: string;
  status?: number;
  timestamp?: string;
  stack?: string | null;
  metadata?: Record<string, unknown>;
};

type FrontendMetricPayload = {
  type: string;
  name: string;
  value: number;
  rating?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

const scrubTelemetryMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(metadata).filter(([key]) => {
    const normalizedKey = key.trim().toLowerCase();
    return (
      !normalizedKey.includes('token') &&
      !normalizedKey.includes('password') &&
      !normalizedKey.includes('authorization')
    );
  });

  if (sanitizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(sanitizedEntries);
};

const postTelemetry = async (path: string, payload: Record<string, unknown>) => {
  const { apiTelemetryEnabled } = loadAppRuntimeConfig();

  if (!apiTelemetryEnabled || typeof window === 'undefined' || FRONTEND_ENVIRONMENT === 'test') {
    return;
  }

  try {
    const requestUrl = buildApiUrl(path);
    await fetch(requestUrl, {
      method: 'POST',
      credentials: getApiCredentialsMode(requestUrl),
      keepalive: true,
      headers: createApiHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(payload),
    });
  } catch {
    // Keep client telemetry best-effort only.
  }
};

export const reportFrontendError = async (payload: FrontendErrorPayload) =>
  postTelemetry(FRONTEND_ERROR_ENDPOINT, {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    context: payload.context ?? 'app',
    severity: payload.severity ?? 'medium',
    stack: payload.stack ?? null,
    metadata: scrubTelemetryMetadata(payload.metadata),
    environment: FRONTEND_ENVIRONMENT,
    release: FRONTEND_RELEASE,
    url: typeof window !== 'undefined' ? window.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });

export const reportFrontendMetric = async (payload: FrontendMetricPayload) =>
  postTelemetry(FRONTEND_METRIC_ENDPOINT, {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    metadata: scrubTelemetryMetadata(payload.metadata),
    environment: FRONTEND_ENVIRONMENT,
    release: FRONTEND_RELEASE,
    url: typeof window !== 'undefined' ? window.location.href : null,
  });

export const invalidateClientSession = () => {
  clearAccessToken();

  void reportFrontendError({
    type: 'AUTH',
    message: 'Frontend session invalidated',
    context: 'auth.session.invalidated',
    severity: 'high',
    status: 401,
  });
  captureWebMessageAsync('Frontend session invalidated', 'auth.session.invalidated');

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALIDATED_EVENT));
};

const resolveApiErrorMessage = (payload: unknown, status: number) => {
  if (payload && typeof payload === 'object') {
    const errorPayload = payload as { error?: unknown; message?: unknown };

    if (typeof errorPayload.error === 'string' && errorPayload.error.trim().length > 0) {
      return errorPayload.error;
    }

    if (typeof errorPayload.message === 'string' && errorPayload.message.trim().length > 0) {
      return errorPayload.message;
    }
  }

  return `HTTP ${status}`;
};

export const buildApiUrl = (url: string) => `${API_BASE}${url}`;

export const createApiHeaders = (headers?: HeadersInit) =>
  Object.fromEntries(withAuthHeader(headers).entries());

const createApiHeadersWithSupabaseFallback = async (headers?: HeadersInit) => {
  const resolvedHeaders = withAuthHeader(headers);

  if (resolvedHeaders.has('Authorization')) {
    return Object.fromEntries(resolvedHeaders.entries());
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token?.trim() ?? '';

  if (!accessToken || !isAccessTokenHeaderSafe(accessToken)) {
    if (accessToken) {
      clearAccessToken();
    }

    return Object.fromEntries(resolvedHeaders.entries());
  }

  setAccessToken(accessToken);
  resolvedHeaders.set('Authorization', `Bearer ${accessToken}`);

  return Object.fromEntries(resolvedHeaders.entries());
};

// Global error handler for API calls
const handleApiError = (error) => {
  console.error('API Error:', error);
  throw error;
};

export const parseJsonResponse = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const createApiRequestError = async (response: Response) => {
  const payload = await parseJsonResponse(response);
  const error = new ApiRequestError(
    resolveApiErrorMessage(payload, response.status),
    response.status,
    payload,
  );

  if (
    response.status >= 500 &&
    !response.url.includes(FRONTEND_ERROR_ENDPOINT) &&
    !response.url.includes(FRONTEND_METRIC_ENDPOINT)
  ) {
    void reportFrontendError({
      type: 'SERVER',
      message: resolveApiErrorMessage(payload, response.status),
      context: 'api.request',
      severity: 'high',
      status: response.status,
      metadata: {
        responseUrl: response.url,
      },
    });
    captureWebExceptionAsync(error, 'api.request', {
      responseUrl: response.url,
      status: response.status,
    });
  }

  return error;
};

export const ensureApiResponse = async (response: Response) => {
  if (!response.ok) {
    throw await createApiRequestError(response);
  }

  return response;
};

export const authorizedFetch = async (url: string, init: RequestInit = {}) => {
  const { headers, credentials: _credentials, ...restInit } = init;
  const requestUrl = buildApiUrl(url);

  return fetch(requestUrl, {
    ...restInit,
    credentials: getApiCredentialsMode(requestUrl),
    headers: await createApiHeadersWithSupabaseFallback(headers),
  });
};

// Generic API wrapper
export const apiClient = {
  get: async (url, options: any = {}) => {
    try {
      const response = await authorizedFetch(url, {
        ...options,
        headers: options.headers,
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  post: async (url, data, options: any = {}) => {
    try {
      const response = await authorizedFetch(url, {
        method: 'POST',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  put: async (url, data, options: any = {}) => {
    try {
      const response = await authorizedFetch(url, {
        method: 'PUT',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async (url, options = {}) => {
    try {
      const response = await authorizedFetch(url, {
        method: 'DELETE',
        ...(options as RequestInit),
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
