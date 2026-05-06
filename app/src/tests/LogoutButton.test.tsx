import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import LogoutButton from '../components/LogoutButton';
import {
  resolveAuthRedirectTarget,
  storePendingAuthRedirect,
} from '../services/authRedirect';
import { renderWithRouter } from './test-utils';

const logoutMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: logoutMock,
  }),
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
    window.sessionStorage.clear();
  });

  test('clears pending auth redirect intent before leaving a protected route', async () => {
    storePendingAuthRedirect('/app/support');

    const { getLocation } = renderWithRouter(<LogoutButton label="Sign Out" />, {
      route: '/app/support',
    });

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(getLocation()?.pathname).toBe('/');
    });

    expect(resolveAuthRedirectTarget('')).toBe('/app');
  });
});
