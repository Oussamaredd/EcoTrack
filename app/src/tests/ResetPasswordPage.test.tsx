import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

const resetPasswordMock = vi.fn();

vi.mock('../services/authApi', () => ({
  authApi: {
    resetPassword: (token: string, password: string) => resetPasswordMock(token, password),
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPasswordMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears stale errors and uses the latest token when the query string changes', async () => {
    resetPasswordMock
      .mockRejectedValueOnce(new Error('Reset token expired.'))
      .mockResolvedValueOnce({ success: true });

    const router = createMemoryRouter(
      [
        { path: '/reset-password', element: <ResetPasswordPage /> },
        { path: '/login', element: <div>Login</div> },
      ],
      {
        initialEntries: ['/reset-password?token=first-token'],
      },
    );

    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'UpdatedPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), {
      target: { value: 'UpdatedPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText('Reset token expired.')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/reset-password?token=second-token');
    });

    await waitFor(() => {
      expect(screen.queryByText('Reset token expired.')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenLastCalledWith('second-token', 'UpdatedPass123!');
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });
});
