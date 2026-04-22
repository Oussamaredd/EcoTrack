import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { loadAppRuntimeConfig } from '../config/runtimeFeatures';
import { apiClient } from '../services/api';
import { invalidatePlanningQueries } from '../state/invalidation';
import { queryKeys } from '../state/queryKeys';

export const usePlanningZones = () => {
  const { planningRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
    queryKey: queryKeys.planningZones,
    queryFn: async () => apiClient.get('/api/planning/zones'),
    staleTime: planningRefreshIntervalMs,
    refetchInterval: planningRefreshIntervalMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
};

export const usePlanningAgents = () => {
  const { planningRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
    queryKey: queryKeys.planningAgents,
    queryFn: async () => apiClient.get('/api/planning/agents'),
    staleTime: planningRefreshIntervalMs,
    refetchInterval: planningRefreshIntervalMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
};

export const usePlanningHeatmap = (
  zoneId?: string | null,
  riskTier: 'all' | 'low' | 'medium' | 'high' = 'all',
  enabled = true,
) => {
  const { planningRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
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
    staleTime: planningRefreshIntervalMs,
    refetchInterval: enabled ? planningRefreshIntervalMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
};

export const usePlanningNotifications = (limit = 20, enabled = true) => {
  const { planningRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
    queryKey: queryKeys.planningNotifications(limit),
    queryFn: async () => apiClient.get(`/api/planning/notifications?limit=${limit}`),
    enabled,
    staleTime: planningRefreshIntervalMs,
    refetchInterval: enabled ? planningRefreshIntervalMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
};

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

export const useManagerToursList = (enabled = true) => {
  const { planningRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
    queryKey: queryKeys.managerTours,
    queryFn: async () => apiClient.get('/api/tours?page=1&pageSize=50'),
    enabled,
    staleTime: planningRefreshIntervalMs,
    refetchOnWindowFocus: false,
  });
};

export const usePlanningDashboard = (enabled = true) => {
  const { planningRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
    queryKey: queryKeys.planningDashboard,
    queryFn: async () => apiClient.get('/api/planning/dashboard'),
    enabled,
    staleTime: planningRefreshIntervalMs,
    refetchInterval: enabled ? planningRefreshIntervalMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
};

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

export const usePlanningReportHistory = () => {
  const { planningRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
    queryKey: queryKeys.planningReportHistory,
    queryFn: async () => apiClient.get('/api/planning/reports/history'),
    staleTime: planningRefreshIntervalMs,
    refetchOnWindowFocus: false,
  });
};

export const useRegenerateManagerReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => apiClient.post(`/api/planning/reports/${reportId}/regenerate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.planningReportHistory });
    },
  });
};
