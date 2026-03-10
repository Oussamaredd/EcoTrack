import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthCallbackPage from '../pages/auth/AuthCallbackPage';

const loginMock = vi.fn();
const exchangeMock = vi.fn();
const clearPendingAuthRedirectMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

vi.mock('../services/authApi', () => ({
  authApi: {
    exchange: (code: string) => exchangeMock(code),
  },
}));

vi.mock('../services/authRedirect', () => ({
  clearPendingAuthRedirect: () => clearPendingAuthRedirectMock(),
  resolveAuthRedirectTarget: (search: string) =>
    new URLSearchParams(search).get('next') ?? '/app',
}));

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loginMock.mockReset();
    exchangeMock.mockReset();
    clearPendingAuthRedirectMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restarts the exchange flow when the callback query changes from an error to a code', async () => {
    const router = createMemoryRouter(
      [
        { path: '/auth/callback', element: <AuthCallbackPage /> },
        { path: '/app', element: <div>Workspace</div> },
      ],
      {
        initialEntries: ['/auth/callback?error=Access%20denied'],
      },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByRole('heading', { name: /sign-in failed/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry sign in/i })).not.toBeInTheDocument();

    exchangeMock.mockResolvedValueOnce({
      accessToken: 'token-123',
      user: { id: 'user-1' },
    });

    await act(async () => {
      await router.navigate('/auth/callback?code=fresh-code');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(exchangeMock).toHaveBeenCalledWith('fresh-code');
    });

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        accessToken: 'token-123',
        user: { id: 'user-1' },
      });
    });

    expect(screen.getByRole('heading', { name: /successfully signed in/i })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(clearPendingAuthRedirectMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Workspace')).toBeInTheDocument();
    });
  });

  it('shows the retry action after an exchange failure and retries the sign-in flow', async () => {
    exchangeMock
      .mockRejectedValueOnce(new Error('Exchange service unavailable.'))
      .mockResolvedValueOnce({
        accessToken: 'token-456',
        user: { id: 'user-2' },
      });

    const router = createMemoryRouter(
      [
        { path: '/auth/callback', element: <AuthCallbackPage /> },
        { path: '/app', element: <div>Workspace</div> },
      ],
      {
        initialEntries: ['/auth/callback?code=retry-code'],
      },
    );

    render(<RouterProvider router={router} />);

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Exchange service unavailable.');

    fireEvent.click(screen.getByRole('button', { name: /retry sign in/i }));

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    await waitFor(() => {
      expect(exchangeMock).toHaveBeenCalledTimes(2);
    });
    expect(exchangeMock).toHaveBeenNthCalledWith(1, 'retry-code');
    expect(exchangeMock).toHaveBeenNthCalledWith(2, 'retry-code');

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        accessToken: 'token-456',
        user: { id: 'user-2' },
      });
    });

    expect(screen.getByRole('heading', { name: /successfully signed in/i })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(clearPendingAuthRedirectMock).toHaveBeenCalledTimes(1);
    });
  });
});
