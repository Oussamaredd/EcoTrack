import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from '../hooks/useAuth';
import AppHomePage from '../pages/AppHomePage';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
}));

describe('AppHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: 'citizen-1',
        displayName: 'Citizen User',
        email: 'citizen@example.com',
        avatarUrl: null,
        role: 'citizen',
        roles: [{ id: 'role-citizen', name: 'citizen' }],
        isActive: true,
        provider: 'local',
      },
      isAuthenticated: true,
      isLoading: false,
      authState: 'authenticated',
      error: null,
    });
  });

  it('uses the shared role hub panel for the citizen lane', () => {
    renderWithProviders(<AppHomePage />, { route: '/app', withAuthProvider: false });

    expect(
      screen.getByRole('heading', { name: /Open citizen reporting when you are ready/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Citizen lane guidance/i })).toBeInTheDocument();
    expect(screen.getByText(/Primary lane/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Citizen experience/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Citizen Reporting/i })[0]).toHaveAttribute(
      'href',
      '/app/citizen/report',
    );
    expect(
      screen.getByText(/keeps the citizen lane lightweight after sign-in/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /Open citizen reporting when you are ready/i })).toHaveLength(1);
  });

  it('keeps the shared workspace host behavior for non-citizen roles', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: 'manager-1',
        displayName: 'Manager User',
        email: 'manager@example.com',
        avatarUrl: null,
        role: 'manager',
        roles: [{ id: 'role-manager', name: 'manager' }],
        isActive: true,
        provider: 'local',
      },
      isAuthenticated: true,
      isLoading: false,
      authState: 'authenticated',
      error: null,
    });

    renderWithProviders(<AppHomePage />, { route: '/app', withAuthProvider: false });

    expect(
      screen.getByRole('heading', { name: /Coordinate the right EcoTrack lane\./i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Open citizen reporting when you are ready/i }),
    ).not.toBeInTheDocument();
  });
});
