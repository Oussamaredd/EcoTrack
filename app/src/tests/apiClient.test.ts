import { describe, expect, it, vi } from 'vitest';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

import {
  AUTH_SESSION_INVALIDATED_EVENT,
  ApiRequestError,
  apiClient,
  authorizedFetch,
  createApiRequestError,
  resolveApiCredentialsMode,
} from '../services/api';
import { ACCESS_TOKEN_STORAGE_KEY, clearAccessToken } from '../services/authToken';

describe('api client error handling', () => {
  it('omits browser cookies for direct cross-origin API requests', () => {
    expect(
      resolveApiCredentialsMode({
        requestUrl: 'http://localhost:3001/api/containers',
        windowOrigin: 'http://localhost:5173',
      }),
    ).toBe('omit');
  });

  it('omits browser cookies for same-origin edge proxy API requests', () => {
    expect(
      resolveApiCredentialsMode({
        requestUrl: 'http://localhost:5173/api/containers',
        windowOrigin: 'http://localhost:5173',
      }),
    ).toBe('omit');
  });

  it('does not add a JSON content-type header to GET requests', async () => {
    clearAccessToken();
    getSessionMock.mockResolvedValueOnce({
      data: {
        session: null,
      },
      error: null,
    });

    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.get('/api/containers?page=1&pageSize=100');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/containers?page=1&pageSize=100'),
      expect.objectContaining({
        credentials: 'omit',
        headers: {},
      }),
    );
  });

  it('uses the current Supabase browser session when the cached API token is missing', async () => {
    clearAccessToken();
    getSessionMock.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'supabase-access-token',
        },
      },
      error: null,
    });

    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await authorizedFetch('/api/citizen/profile');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/citizen/profile'),
      expect.objectContaining({
        credentials: 'omit',
        headers: expect.objectContaining({
          authorization: 'Bearer supabase-access-token',
        }),
      }),
    );
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('supabase-access-token');
  });

  it('does not clear the browser session for ordinary API 401 responses', async () => {
    const invalidatedListener = vi.fn();
    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, invalidatedListener);

    try {
      const error = await createApiRequestError(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error.status).toBe(401);
      expect(invalidatedListener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, invalidatedListener);
    }
  });
});
