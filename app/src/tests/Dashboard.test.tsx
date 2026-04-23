import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useCurrentUser } from '../hooks/useAuth';
import { usePlanningDashboard } from '../hooks/usePlanning';
import { usePlanningRealtimeSocket } from '../hooks/usePlanningRealtimeSocket';
import { usePlanningRealtimeStream } from '../hooks/usePlanningRealtimeStream';
import Dashboard from '../pages/Dashboard';
import { useDashboard } from '../hooks/useTickets';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('../hooks/usePlanning', () => ({
  usePlanningDashboard: vi.fn(),
}));

vi.mock('../hooks/usePlanningRealtimeSocket', () => ({
  usePlanningRealtimeSocket: vi.fn(),
}));

vi.mock('../hooks/usePlanningRealtimeStream', () => ({
  usePlanningRealtimeStream: vi.fn(),
}));

vi.mock('../hooks/useTickets', () => ({
  useDashboard: vi.fn(),
}));

const dashboardResponsePayload = {
  summary: {
    total: 42,
    open: 12,
    completed: 24,
    assigned: 36,
  },
  statusBreakdown: {
    open: 12,
    in_progress: 6,
    completed: 24,
  },
  recentActivity: [
    { date: "2026-02-08", created: 3, updated: 5 },
    { date: "2026-02-09", created: 4, updated: 6 },
    { date: "2026-02-10", created: 2, updated: 8 },
  ],
  recentTickets: [
    {
      id: "1",
      name: "Lobby AC issue",
      status: "open",
      supportCategory: "general_help",
      createdAt: "2026-02-10T09:00:00.000Z",
      updatedAt: "2026-02-11T10:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useCurrentUser).mockReturnValue({
    user: {
      id: 'manager-1',
      displayName: 'Test User',
      email: 'test@example.com',
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

  vi.mocked(useDashboard).mockReturnValue({
    data: dashboardResponsePayload,
    isFetching: false,
    isLoading: false,
    isError: false,
    error: null,
    dataUpdatedAt: Date.now(),
  } as ReturnType<typeof useDashboard>);

  vi.mocked(usePlanningDashboard).mockReturnValue({
    data: {},
    isFetching: false,
    dataUpdatedAt: Date.now(),
  } as ReturnType<typeof usePlanningDashboard>);

  vi.mocked(usePlanningRealtimeSocket).mockReturnValue({
    connectionState: 'fallback',
    lastEventAt: null,
    isConnected: false,
  });

  vi.mocked(usePlanningRealtimeStream).mockReturnValue({
    connectionState: 'disabled',
    lastEventAt: null,
    isConnected: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Dashboard Component', () => {
  test('renders an EcoTrack activity dashboard', async () => {
    renderWithProviders(<Dashboard />, { withAuthProvider: false });

    expect(
      await screen.findByRole('heading', { name: /Welcome back, Test/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Total tickets/i)).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText(/Recent ticket activity/i)).toBeInTheDocument();
    expect(await screen.findByText(/Lobby AC issue/i)).toBeInTheDocument();
  });

  test('does not render dashboard quick links that redirect to other pages', async () => {
    renderWithProviders(<Dashboard />, { withAuthProvider: false });

    await screen.findByRole('heading', { name: /Welcome back, Test/i });

    expect(
      screen.queryByRole('link', { name: /View Tickets/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Create Ticket/i }),
    ).not.toBeInTheDocument();
  });
});
