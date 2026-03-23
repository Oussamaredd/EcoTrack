import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../services/api';
import { invalidatePlanningQueries } from '../state/invalidation';
import { queryKeys } from '../state/queryKeys';

const PLANNING_METADATA_REFETCH_INTERVAL_MS = 30_000;
const PLANNING_DASHBOARD_REFETCH_INTERVAL_MS = 20_000;

export const usePlanningZones = () =>
  useQuery({
    queryKey: queryKeys.planningZones,
    queryFn: async () => apiClient.get('/api/planning/zones'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: PLANNING_METADATA_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

export const usePlanningAgents = () =>
  useQuery({
    queryKey: queryKeys.planningAgents,
    queryFn: async () => apiClient.get('/api/planning/agents'),
    staleTime: 60_000,
    refetchInterval: PLANNING_METADATA_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

export const usePlanningHeatmap = (
  zoneId?: string | null,
  riskTier: 'all' | 'low' | 'medium' | 'high' = 'all',
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.planningHeatmap(zoneId, riskTier),
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (zoneId) {
        searchParams.set('zoneId', zoneId);
      }

      if (riskTier !== 'all') {
        searchParams.set('riskTier', riskTier);
      }

      const query = searchParams.toString();
      return apiClient.get(`/api/planning/heatmap${query ? `?${query}` : ''}`);
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? PLANNING_DASHBOARD_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

export const usePlanningNotifications = (limit = 20, enabled = true) =>
  useQuery({
    queryKey: queryKeys.planningNotifications(limit),
    queryFn: async () => apiClient.get(`/api/planning/notifications?limit=${limit}`),
    enabled,
    staleTime: 15_000,
  });

export const useOptimizeTourPlan = () =>
  useMutation({
    mutationFn: async (payload: {
      zoneId: string;
      scheduledFor: string;
      fillThresholdPercent: number;
      manualContainerIds?: string[];
    }) => apiClient.post('/api/planning/optimize-tour', payload),
  });

export const useCreatePlannedTour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      zoneId: string;
      scheduledFor: string;
      assignedAgentId?: string;
      orderedContainerIds: string[];
    }) => apiClient.post('/api/planning/create-tour', payload),
    onSuccess: async () => {
      await invalidatePlanningQueries(queryClient);
    },
  });
};

export const useRebuildTourRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tourId: string) => apiClient.post(`/api/tours/${tourId}/route/rebuild`, {}),
    onSuccess: async () => {
      await invalidatePlanningQueries(queryClient);
    },
  });
};

export const useManagerToursList = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.managerTours,
    queryFn: async () => apiClient.get('/api/tours?page=1&pageSize=50'),
    enabled,
    staleTime: 15_000,
  });

export const usePlanningDashboard = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.planningDashboard,
    queryFn: async () => apiClient.get('/api/planning/dashboard'),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? PLANNING_DASHBOARD_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

export const useEmergencyCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { containerId: string; reason: string; assignedAgentId?: string }) =>
      apiClient.post('/api/planning/emergency-collection', payload),
    onSuccess: async () => {
      await invalidatePlanningQueries(queryClient);
    },
  });
};

export const useGenerateManagerReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      periodStart: string;
      periodEnd: string;
      selectedKpis: string[];
      sendEmail?: boolean;
      emailTo?: string;
      format?: string;
    }) => apiClient.post('/api/planning/reports/generate', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.planningReportHistory });
    },
  });
};

export const usePlanningReportHistory = () =>
  useQuery({
    queryKey: queryKeys.planningReportHistory,
    queryFn: async () => apiClient.get('/api/planning/reports/history'),
    staleTime: 15_000,
  });

export const useRegenerateManagerReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => apiClient.post(`/api/planning/reports/${reportId}/regenerate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.planningReportHistory });
    },
  });
};
