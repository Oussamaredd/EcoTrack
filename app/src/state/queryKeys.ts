export const queryKeys = {
  auth: ["auth"] as const,
  dashboard: ["dashboard"] as const,
  tickets: (filters: Record<string, unknown> = {}) => ["tickets", filters] as const,
  ticket: (id?: string | null) => ["ticket", id ?? "none"] as const,
  ticketComments: (ticketId?: string | null, page = 1) =>
    ["ticket-comments", ticketId ?? "none", page] as const,
  ticketActivity: (ticketId?: string | null) => ["ticket-activity", ticketId ?? "none"] as const,
  planningZones: ["planning-zones"] as const,
  planningAgents: ["planning-agents"] as const,
  planningDashboard: ["planning-dashboard"] as const,
  planningHeatmap: (zoneId?: string | null, riskTier = "all") =>
    ["planning-heatmap", zoneId ?? "all", riskTier] as const,
  planningNotifications: (limit = 50) => ["planning-notifications", limit] as const,
  planningReportHistory: ["planning-report-history"] as const,
  managerTours: ["manager-tours"] as const,
  agentTour: ["agent-tour"] as const,
} as const;

export type AppQueryKeys = typeof queryKeys;
