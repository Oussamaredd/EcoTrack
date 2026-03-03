import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useManagerToursList, useRebuildTourRoute } from "../hooks/usePlanning";
import ManagerToursPage from "../pages/ManagerToursPage";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/usePlanning", () => ({
  useManagerToursList: vi.fn(),
  useRebuildTourRoute: vi.fn(),
}));

describe("ManagerToursPage", () => {
  const mutateAsync = vi.fn();
  const refetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useManagerToursList).mockReturnValue({
      data: {
        tours: [
          {
            id: "tour-1",
            name: "Downtown Morning Round",
            status: "planned",
            scheduledFor: "2026-03-02T07:30:00.000Z",
            zoneName: "Downtown",
            assignedAgentId: "agent-1",
            updatedAt: "2026-03-02T06:55:00.000Z",
          },
          {
            id: "tour-2",
            name: "Left Bank Round",
            status: "in_progress",
            scheduledFor: "2026-03-02T09:15:00.000Z",
            zoneName: "Left Bank",
            assignedAgentId: null,
            updatedAt: "2026-03-02T09:00:00.000Z",
          },
        ],
        pagination: {
          total: 2,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useManagerToursList>);

    vi.mocked(useRebuildTourRoute).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRebuildTourRoute>);
  });

  it("renders listed tours and rebuilds a selected stored route", async () => {
    mutateAsync.mockResolvedValueOnce({
      routeGeometry: {
        source: "live",
        provider: "router.example.test",
      },
    });

    renderWithProviders(<ManagerToursPage />, {
      route: "/app/manager/tours",
      withAuthProvider: false,
    });

    expect(await screen.findByRole("heading", { name: /Tour Operations/i })).toBeInTheDocument();
    expect(screen.getByText(/Downtown Morning Round/i)).toBeInTheDocument();
    expect(screen.getByText(/Left Bank Round/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Rebuild route for Left Bank Round/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith("tour-2");
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      /stored route rebuilt for left bank round\. latest persisted result is a road route from router\.example\.test\./i,
    );
  });

  it("shows a retry action when the tours list cannot be loaded", () => {
    vi.mocked(useManagerToursList).mockReturnValue({
      data: { tours: [] },
      isLoading: false,
      isError: true,
      error: new Error("backend unavailable"),
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useManagerToursList>);

    renderWithProviders(<ManagerToursPage />, {
      route: "/app/manager/tours",
      withAuthProvider: false,
    });

    expect(screen.getByText(/Unable to load tours: backend unavailable/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});
