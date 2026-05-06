import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import LoginPage from '../pages/auth/LoginPage';
import { renderWithRouter } from './test-utils';

const { mockLogin, mockStorePendingAuthRedirect, mockClearPendingAuthRedirect } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockStorePendingAuthRedirect: vi.fn(),
  mockClearPendingAuthRedirect: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('../services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    startGoogleSignIn: vi.fn(),
  },
}));

vi.mock('../services/authRedirect', () => ({
  clearPendingAuthRedirect: mockClearPendingAuthRedirect,
  resolveRequestedAuthRedirect: vi.fn((search: string) => new URLSearchParams(search).get('next') ?? '/app'),
  storePendingAuthRedirect: mockStorePendingAuthRedirect,
}));

const authApiModule = await import('../services/authApi');
const mockAuthApiLogin = vi.mocked(authApiModule.authApi.login);
const mockStartGoogleSignIn = vi.mocked(authApiModule.authApi.startGoogleSignIn);

describe('LoginPage', () => {
  let locationGetterSpy: ReturnType<typeof vi.spyOn>;
  let mockLocationAssign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogin.mockReset();
    mockAuthApiLogin.mockReset();
    mockStartGoogleSignIn.mockReset();
    mockStorePendingAuthRedirect.mockReset();
    mockClearPendingAuthRedirect.mockReset();
    mockLocationAssign = vi.fn();
    locationGetterSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign: mockLocationAssign,
    } as Location);
  });

  afterEach(() => {
    locationGetterSpy?.mockRestore();
    vi.unstubAllGlobals();
  });

  test('does not render an API connection warning while idle', () => {
    renderWithRouter(<LoginPage />, { route: '/login' });

    expect(screen.getByLabelText(/email/i)).toBeEnabled();
    expect(screen.getByLabelText(/password/i)).toBeEnabled();
    expect(screen.queryByText(/having trouble reaching the api/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/checking service connection/i)).not.toBeInTheDocument();
  });

  test('starts google sign-in immediately without a health precheck', async () => {
    mockStartGoogleSignIn.mockResolvedValue('https://example.supabase.co/auth/v1/authorize');

    renderWithRouter(<LoginPage />, { route: '/login' });

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(mockStartGoogleSignIn).toHaveBeenCalledTimes(1);
      expect(mockStorePendingAuthRedirect).toHaveBeenCalledWith('/app');
      expect(mockLocationAssign).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/authorize');
    });
  });

  test('stores the requested deep link before starting google sign-in', async () => {
    mockStartGoogleSignIn.mockResolvedValue('https://example.supabase.co/auth/v1/authorize');

    renderWithRouter(<LoginPage />, { route: '/login?next=/app/support' });

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(mockStorePendingAuthRedirect).toHaveBeenCalledWith('/app/support');
      expect(mockLocationAssign).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/authorize');
    });
  });

  test('submits email sign-in without a preflight health gate', async () => {
    mockAuthApiLogin.mockResolvedValue({
      accessToken: 'token',
      user: {
        id: 'user-1',
        email: 'a@admin.fr',
        displayName: 'Admin User',
        avatarUrl: null,
        role: 'admin',
        roles: [],
        isActive: true,
        provider: 'local',
      },
    });

    const { getLocation } = renderWithRouter(<LoginPage />, { route: '/login' });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@admin.fr' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockAuthApiLogin).toHaveBeenCalledWith('a@admin.fr', 'password123');
      expect(mockLogin).toHaveBeenCalledWith({
        accessToken: 'token',
        user: expect.objectContaining({
          email: 'a@admin.fr',
        }),
      });
      expect(getLocation()?.pathname).toBe('/app');
    });
  });

  test('returns to a protected deep link only when login was reached with an explicit next parameter', async () => {
    mockAuthApiLogin.mockResolvedValue({
      accessToken: 'token',
      user: {
        id: 'user-1',
        email: 'support@example.com',
        displayName: 'Support User',
        avatarUrl: null,
        role: 'agent',
        roles: [],
        isActive: true,
        provider: 'local',
      },
    });

    const { getLocation } = renderWithRouter(<LoginPage />, { route: '/login?next=/app/support' });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockAuthApiLogin).toHaveBeenCalledWith('support@example.com', 'password123');
      expect(getLocation()?.pathname).toBe('/app/support');
    });
  });

  test('surfaces auth failures through an accessible alert banner', async () => {
    mockAuthApiLogin.mockRejectedValue(new Error('Invalid credentials'));

    renderWithRouter(<LoginPage />, { route: '/login' });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@admin.fr' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
    });
  });
});
