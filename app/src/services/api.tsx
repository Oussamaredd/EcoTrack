// API client with centralized configuration and error handling
import { clearAccessToken, withAuthHeader } from './authToken';

const FALLBACK_API_BASE = 'http://localhost:3001';
const EDGE_PROXY_ENABLED = import.meta.env.VITE_USE_EDGE_API_PROXY === 'true';

const resolveDefaultApiBase = () => {
  if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    const origin = window.location.origin.trim();
    if (origin.length > 0) {
      return origin;
    }
  }

  return FALLBACK_API_BASE;
};

const configuredApiBase =
  import.meta.env.VITE_API_BASE_URL ??
  // Temporary alias support during migration to VITE_API_BASE_URL.
  import.meta.env.VITE_API_URL;

const resolveApiBaseFromRuntime = () => {
  if (EDGE_PROXY_ENABLED) {
    return resolveDefaultApiBase();
  }

  if (typeof configuredApiBase === 'string' && configuredApiBase.trim().length > 0) {
    return configuredApiBase;
  }

  return resolveDefaultApiBase();
};

const rawApiBase =
  resolveApiBaseFromRuntime();

const trimmedApiBase = rawApiBase.replace(/\/+$/, '');
export const API_BASE = trimmedApiBase.endsWith('/api')
  ? trimmedApiBase.slice(0, -4)
  : trimmedApiBase;

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

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

export const invalidateClientSession = () => {
  clearAccessToken();

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

  if (response.status === 401) {
    invalidateClientSession();
  }

  return new ApiRequestError(
    resolveApiErrorMessage(payload, response.status),
    response.status,
    payload,
  );
};

export const ensureApiResponse = async (response: Response) => {
  if (!response.ok) {
    throw await createApiRequestError(response);
  }

  return response;
};

export const authorizedFetch = (url: string, init: RequestInit = {}) => {
  const { headers, ...restInit } = init;

  return fetch(buildApiUrl(url), {
    credentials: 'include',
    ...restInit,
    headers: createApiHeaders(headers),
  });
};

// Generic API wrapper
export const apiClient = {
  get: async (url, options: any = {}) => {
    try {
      const response = await authorizedFetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
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
