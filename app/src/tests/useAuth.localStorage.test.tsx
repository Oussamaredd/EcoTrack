import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AuthProvider, useAuth } from '../hooks/useAuth';
import { AUTH_SESSION_INVALIDATED_EVENT } from '../services/api';
import { resolveAuthRedirectTarget, storePendingAuthRedirect } from '../services/authRedirect';
import { ACCESS_TOKEN_STORAGE_KEY } from '../services/authToken';

const {
  mockSupabaseGetSession,
  mockSupabaseOnAuthStateChange,
  mockSupabaseRefreshSession,
  mockSupabaseSetSession,
  mockSupabaseSignOut,
  mockSupabaseUpdateUser,
} = vi.hoisted(() => ({
  mockSupabaseGetSession: vi.fn(),
  mockSupabaseOnAuthStateChange: vi.fn(),
  mockSupabaseRefreshSession: vi.fn(),
  mockSupabaseSetSession: vi.fn(),
  mockSupabaseSignOut: vi.fn(),
  mockSupabaseUpdateUser: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockSupabaseGetSession,
      onAuthStateChange: mockSupabaseOnAuthStateChange,
      refreshSession: mockSupabaseRefreshSession,
      setSession: mockSupabaseSetSession,
      signOut: mockSupabaseSignOut,
      updateUser: mockSupabaseUpdateUser,
    },
  },
}));

const supabaseSession = {
  access_token: 'token-123',
  refresh_token: 'refresh-token-1',
  user: {
    id: 'supabase-user-1',
    email: 'local@example.com',
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      display_name: 'Local User',
      is_active: true,
      legacy_user_id: 'user-1',
      role: 'agent',
    },
  },
};

const session = {
  accessToken: 'token-123',
  user: {
    id: 'user-1',
    email: 'local@example.com',
    displayName: 'Local User',
    avatarUrl: null,
    role: 'agent',
    roles: [],
    isActive: true,
    provider: 'local' as const,
  },
};

const encodeJwtPart = (payload: Record<string, unknown>) =>
  window
    .btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const createUnsignedJwt = (payload: Record<string, unknown>) =>
  `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart(payload)}.signature`;

function AuthProbe() {
  const { authState, login, logout, getAuthHeaders, isAuthenticated, isLoading, user } = useAuth();
  const headers = getAuthHeaders();

  return (
    <div>
      <button type="button" onClick={() => login(session)}>
        set-session
      </button>
      <button type="button" onClick={() => void logout()}>
        clear-session
      </button>
      <p data-testid="auth-header">{headers.Authorization ?? ''}</p>
      <p data-testid="auth-is-authenticated">{String(isAuthenticated)}</p>
      <p data-testid="auth-role">{user?.role ?? ''}</p>
      <p data-testid="auth-state">{authState}</p>
      <p data-testid="auth-loading">{String(isLoading)}</p>
    </div>
  );
}

describe('useAuth local storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    mockSupabaseOnAuthStateChange.mockImplementation(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    }));
    mockSupabaseRefreshSession.mockResolvedValue({
      data: {
        session: null,
        user: null,
      },
      error: null,
    });
    mockSupabaseSetSession.mockResolvedValue({
      data: {
        session: null,
        user: null,
      },
      error: null,
    });
    mockSupabaseSignOut.mockResolvedValue({ error: null });
    mockSupabaseUpdateUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('stores JWT in localStorage and exposes Authorization header', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-session' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('token-123');
      expect(screen.getByTestId('auth-header').textContent).toBe('Bearer token-123');
    });
  });

  test('restores an authenticated session from Supabase without contacting the backend', async () => {
    window.history.pushState({}, '', '/app');
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: supabaseSession,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    expect(screen.getByTestId('auth-header').textContent).toBe('Bearer token-123');
    expect(screen.getByTestId('auth-is-authenticated').textContent).toBe('true');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test('prefers Supabase app metadata roles over editable user metadata roles', async () => {
    window.history.pushState({}, '', '/app');
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: {
          ...supabaseSession,
          user: {
            ...supabaseSession.user,
            app_metadata: {
              ...supabaseSession.user.app_metadata,
              role: 'manager',
              roles: ['manager'],
            },
          },
        },
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-role').textContent).toBe('manager');
    });

    expect(window.fetch).not.toHaveBeenCalled();
  });

  test('repairs oversized Supabase profile image metadata before caching the API bearer', async () => {
    window.history.pushState({}, '', '/app');
    const bulkyImageValue = `data:image/png;base64,${'a'.repeat(24_000)}`;
    const oversizedSession = {
      ...supabaseSession,
      access_token: createUnsignedJwt({
        sub: supabaseSession.user.id,
        email: supabaseSession.user.email,
        app_metadata: supabaseSession.user.app_metadata,
        user_metadata: {
          ...supabaseSession.user.user_metadata,
          avatar_url: bulkyImageValue,
          picture: bulkyImageValue,
        },
      }),
      user: {
        ...supabaseSession.user,
        user_metadata: {
          ...supabaseSession.user.user_metadata,
          avatar_url: bulkyImageValue,
          picture: bulkyImageValue,
        },
      },
    };
    const repairedSession = {
      ...supabaseSession,
      access_token: 'token-123',
      user: {
        ...supabaseSession.user,
        user_metadata: {
          ...supabaseSession.user.user_metadata,
          avatar_url: null,
          picture: null,
        },
      },
    };

    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: oversizedSession,
      },
      error: null,
    });
    mockSupabaseSetSession.mockResolvedValue({
      data: {
        session: repairedSession,
        user: repairedSession.user,
      },
      error: null,
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          accessToken: repairedSession.access_token,
          refreshToken: 'refresh-token-2',
          tokenType: 'bearer',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/supabase/session/repair-profile-metadata'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        body: JSON.stringify({ refreshToken: 'refresh-token-1' }),
      }),
    );
    expect(mockSupabaseSetSession).toHaveBeenCalledWith({
      access_token: 'token-123',
      refresh_token: 'refresh-token-2',
    });
    expect(mockSupabaseUpdateUser).not.toHaveBeenCalled();
    expect(mockSupabaseRefreshSession).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('token-123');
    expect(screen.getByTestId('auth-header').textContent).toBe('Bearer token-123');
  });

  test('keeps public routes interactive while anonymous session discovery stays client-side', async () => {
    window.history.pushState({}, '', '/login');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    });

    expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test('clears stale stored bearer when the Supabase session is missing', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'stale-token');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('auth-header').textContent).toBe('');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test('explicit logout clears stale protected-route redirect intent', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'token-123');
    storePendingAuthRedirect('/app/support');
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: supabaseSession,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    fireEvent.click(screen.getByRole('button', { name: 'clear-session' }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(resolveAuthRedirectTarget('')).toBe('/app');
  });

  test('invalidating the session clears auth state and signs out the local Supabase client', async () => {
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: supabaseSession,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(mockSupabaseSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
