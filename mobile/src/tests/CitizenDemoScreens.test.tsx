import React from "react";
import { screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { citizenApi } from "@api/modules/citizen";
import { containersApi } from "@api/modules/containers";
import { ChallengesScreen } from "@/features/challenges/ChallengesScreen";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { HistoryScreen } from "@/features/history/HistoryScreen";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { ScheduleScreen } from "@/features/schedule/ScheduleScreen";
import { getNotificationPermissionState } from "@/device/notifications";
import { mobileFireEvent, renderMobileScreenAsync } from "./test-utils";

vi.mock("@api/modules/citizen", () => ({
  citizenApi: {
    enrollInChallenge: vi.fn(),
    getChallenges: vi.fn(),
    getHistory: vi.fn(),
    getProfile: vi.fn(),
    updateChallengeProgress: vi.fn()
  }
}));

vi.mock("@api/modules/containers", () => ({
  containersApi: {
    list: vi.fn()
  }
}));

vi.mock("@/device/notifications", () => ({
  formatNotificationPermissionState: vi.fn((state?: string | null) =>
    state === "granted" ? "Granted" : "Unknown"
  ),
  getNotificationPermissionState: vi.fn()
}));

vi.mock("@/providers/NotificationProvider", () => ({
  useNotificationController: () => ({
    inbox: [],
    lastNotification: null,
    markNotificationRead: vi.fn(),
    permissionState: "granted",
    refreshPermissionState: vi.fn(),
    registrationError: null,
    registrationState: "registered",
    requestRegistration: vi.fn(),
    unreadCount: 2
  })
}));

const mockProfile = {
  user: {
    id: "citizen-1",
    email: "citizen@example.com",
    displayName: "Citizen Demo"
  },
  gamification: {
    points: 120,
    level: 3,
    badges: ["Reporter"],
    leaderboardPosition: 4
  },
  impact: {
    reportsSubmitted: 2,
    reportsResolved: 1,
    estimatedWasteDivertedKg: 12,
    estimatedCo2SavedKg: 5
  }
};

const mockContainer = {
  id: "container-1",
  code: "PAR-01-001",
  label: "10 Rue De L Echelle - Verre",
  zoneName: "Zone 1",
  status: "critical",
  latitude: "48.8566",
  longitude: "2.3522",
  fillLevelPercent: 100
};

describe("citizen demo mobile screens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(citizenApi.getProfile).mockResolvedValue(mockProfile as never);
    vi.mocked(citizenApi.getChallenges).mockResolvedValue({
      challenges: [
        {
          id: "challenge-1",
          code: "WEEKLY_REPORTER",
          title: "Weekly reporter",
          description: "Submit three container reports this week.",
          targetValue: 3,
          rewardPoints: 50,
          enrollmentStatus: "in_progress",
          progress: 1,
          completionPercent: 33
        },
        {
          id: "challenge-2",
          code: "FIRST_REPORT",
          title: "First report",
          description: "Send your first citizen report.",
          targetValue: 1,
          rewardPoints: 20,
          enrollmentStatus: "completed",
          progress: 1,
          completionPercent: 100
        },
        {
          id: "challenge-3",
          code: "NEIGHBORHOOD_START",
          title: "Neighborhood starter",
          description: "Join a local cleanup goal.",
          targetValue: 2,
          rewardPoints: 30,
          enrollmentStatus: "not_enrolled",
          progress: 0,
          completionPercent: 0
        }
      ]
    } as never);
    vi.mocked(citizenApi.enrollInChallenge).mockResolvedValue({ enrolled: true } as never);
    vi.mocked(citizenApi.updateChallengeProgress).mockResolvedValue({ updated: true } as never);
    vi.mocked(citizenApi.getHistory).mockResolvedValue({
      history: [
        {
          id: "report-1",
          containerId: "container-1",
          containerCode: "PAR-01-001",
          containerLabel: "10 Rue De L Echelle - Verre",
          status: "submitted",
          reportType: "container_full",
          description: "Container full",
          photoUrl: null,
          latitude: "48.8566",
          longitude: "2.3522",
          reportedAt: "2026-06-29T10:00:00.000Z"
        }
      ],
      pagination: {
        total: 1,
        page: 1,
        pageSize: 8,
        hasNext: false
      }
    } as never);
    vi.mocked(containersApi.list).mockResolvedValue({
      containers: [mockContainer],
      pagination: {
        total: 1,
        page: 1,
        pageSize: 6,
        hasNext: false
      }
    } as never);
    vi.mocked(getNotificationPermissionState).mockResolvedValue("granted" as never);
  });

  it("renders the challenge summary and challenge progress for the demo", async () => {
    await renderMobileScreenAsync(<ChallengesScreen />);

    expect(await screen.findByText("Weekly reporter")).toBeTruthy();
    expect(screen.getByText("First report")).toBeTruthy();
    expect(screen.getByText("Neighborhood starter")).toBeTruthy();
    expect(screen.getByText("1/3 complete | 33%")).toBeTruthy();
    expect(screen.queryByText("Filters")).toBeNull();
  });

  it("lets the citizen join and progress challenges with clear feedback", async () => {
    await renderMobileScreenAsync(<ChallengesScreen />);

    expect(await screen.findByText("Neighborhood starter")).toBeTruthy();

    await mobileFireEvent.click(screen.getByRole("button", { name: /Join goal/i }));

    await waitFor(() => {
      expect(citizenApi.enrollInChallenge).toHaveBeenCalledWith("challenge-3");
    });
    expect(await screen.findByText(/Neighborhood starter joined/i)).toBeTruthy();

    await mobileFireEvent.click(screen.getByRole("button", { name: /Add progress/i }));

    await waitFor(() => {
      expect(citizenApi.updateChallengeProgress).toHaveBeenCalledWith("challenge-1", 1);
    });
    expect(await screen.findByText(/Weekly reporter updated/i)).toBeTruthy();
  });

  it("shows local challenge data when the challenge endpoint has no catalog", async () => {
    vi.mocked(citizenApi.getChallenges).mockResolvedValueOnce({ challenges: [] } as never);

    await renderMobileScreenAsync(<ChallengesScreen />);

    expect(await screen.findByText("Neighborhood Reporter Sprint")).toBeTruthy();
    expect(screen.getByText("Smart Route Support")).toBeTruthy();
    expect(screen.queryByText(/Try again/i)).toBeNull();

    await mobileFireEvent.click(screen.getByRole("button", { name: /Join goal/i }));

    expect(citizenApi.enrollInChallenge).not.toHaveBeenCalled();
    expect(await screen.findByText(/Smart Route Support joined/i)).toBeTruthy();
  });

  it("keeps the home tab usable when challenges are temporarily unavailable", async () => {
    vi.mocked(citizenApi.getChallenges).mockRejectedValueOnce(new Error("Remote cold start"));

    await renderMobileScreenAsync(<DashboardScreen />);

    expect(await screen.findByText("Report a container")).toBeTruthy();
    expect(await screen.findByText("2 active challenges")).toBeTruthy();
    expect(screen.queryByText("Challenges unavailable")).toBeNull();
  });

  it("renders report history as a simple incremental timeline", async () => {
    vi.mocked(citizenApi.getHistory).mockResolvedValueOnce({
      history: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 50,
        hasNext: false
      }
    } as never);

    await renderMobileScreenAsync(<HistoryScreen />);

    expect(await screen.findByText(/PAR-01-001 - Rue de Rivoli - Verre/i)).toBeTruthy();
    expect(screen.getByText(/PAR-01-010/i)).toBeTruthy();
    expect(screen.queryByText(/PAR-01-011/i)).toBeNull();
    expect(screen.queryByText("Filters")).toBeNull();
    expect(screen.queryByText(/Page 1/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Back to top/i })).toBeTruthy();
  });

  it("renders schedule reminders and nearby service", async () => {
    await renderMobileScreenAsync(<ScheduleScreen />);

    expect(await screen.findByText("Collection reminders")).toBeTruthy();
    expect(screen.getByText("Nearby service")).toBeTruthy();
    expect(screen.getByText("PAR-01-001")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("keeps profile focused on identity, gamification, and impact", async () => {
    await renderMobileScreenAsync(<ProfileScreen />);

    expect(await screen.findByText("Identity")).toBeTruthy();
    expect(screen.getByText(/Citizen Demo/i)).toBeTruthy();
    expect(screen.getByText("Gamification")).toBeTruthy();
    expect(screen.getByText("Impact")).toBeTruthy();
    expect(screen.queryByText("Citizen navigation")).toBeNull();
    expect(screen.queryByText("Notifications")).toBeNull();
  });
});
