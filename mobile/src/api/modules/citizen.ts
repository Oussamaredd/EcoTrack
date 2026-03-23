import { apiClient } from "@api/core/http";

import type { CitizenReportType } from "@/lib/citizenReports";

export type CitizenProfile = {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  gamification: {
    points: number;
    level: number;
    badges: string[];
    leaderboardPosition: number;
  };
  impact: {
    reportsSubmitted: number;
    reportsResolved: number;
    estimatedWasteDivertedKg: number;
    estimatedCo2SavedKg: number;
  };
};

export type CitizenHistoryItem = {
  id: string;
  containerId: string;
  containerCode: string | null;
  containerLabel: string | null;
  status: string;
  reportType: CitizenReportType;
  description: string;
  photoUrl: string | null;
  latitude: string | null;
  longitude: string | null;
  reportedAt: string;
};

export type CitizenHistoryResponse = {
  history: CitizenHistoryItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  };
};

export type CitizenChallenge = {
  id: string;
  code: string;
  title: string;
  description: string;
  targetValue: number;
  rewardPoints: number;
  enrollmentStatus: string;
  progress: number;
  completionPercent: number;
};

export type CitizenChallengesResponse = {
  challenges: CitizenChallenge[];
};

export type CitizenReportPayload = {
  containerId: string;
  reportType: CitizenReportType;
  description?: string;
  latitude?: string;
  longitude?: string;
  photoUrl?: string;
};

export type CitizenReportResponse = {
  id: string;
  reportType: CitizenReportType;
  description: string;
  confirmationState: string;
  confirmationMessage: string;
  managerNotificationQueued?: boolean;
  citizenNotificationId?: string | null;
  citizenPushNotificationQueued?: boolean;
  gamification: {
    pointsAwarded: number;
    badges: string[];
  };
};

export type CitizenNotificationItem = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  status: string;
  deepLink: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type CitizenNotificationDevicePayload = {
  provider: "expo";
  platform: "ios" | "android";
  pushToken: string;
  appVersion?: string;
  deviceLabel?: string;
};

export type CitizenNotificationDeviceResponse = {
  registered: boolean;
  device: {
    id: string;
    provider: "expo";
    platform: "ios" | "android";
    pushToken: string;
    status: string;
    appVersion: string | null;
    deviceLabel: string | null;
    lastRegisteredAt: string;
  } | null;
};

export const citizenApi = {
  getProfile: () => apiClient.get<CitizenProfile>("/api/citizen/profile"),

  getHistory: (page = 1, pageSize = 8) =>
    apiClient.get<CitizenHistoryResponse>(
      `/api/citizen/history?page=${page}&pageSize=${pageSize}`
    ),

  getChallenges: () =>
    apiClient.get<CitizenChallengesResponse>("/api/citizen/challenges"),

  createReport: (payload: CitizenReportPayload) =>
    apiClient.post<CitizenReportResponse>("/api/citizen/reports", payload),

  getNotifications: (limit = 20) =>
    apiClient.get<{ notifications: CitizenNotificationItem[] }>(
      `/api/citizen/notifications?limit=${limit}`
    ),

  registerNotificationDevice: (payload: CitizenNotificationDevicePayload) =>
    apiClient.post<CitizenNotificationDeviceResponse>(
      "/api/citizen/notifications/devices",
      payload
    ),

  markNotificationRead: (notificationId: string) =>
    apiClient.post<{ notificationId: string; status: string; readAt: string | null }>(
      `/api/citizen/notifications/${notificationId}/read`,
      {}
    ),

  enrollInChallenge: (challengeId: string) =>
    apiClient.post(`/api/citizen/challenges/${challengeId}/enroll`, {}),

  updateChallengeProgress: (challengeId: string, progressDelta: number) =>
    apiClient.post(`/api/citizen/challenges/${challengeId}/progress`, {
      progressDelta
    })
};
