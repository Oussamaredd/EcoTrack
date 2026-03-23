import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export const invalidateDashboardQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.planningDashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.planningHeatmap() }),
  ]);
};

export const invalidatePlanningQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.agentTour }),
    queryClient.invalidateQueries({ queryKey: queryKeys.managerTours }),
    queryClient.invalidateQueries({ queryKey: queryKeys.planningDashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.planningHeatmap() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.planningNotifications() }),
  ]);
};

export const invalidateTicketQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["tickets"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
};
