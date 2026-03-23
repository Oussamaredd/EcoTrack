import React from "react";

export type DashboardRiskTier = "all" | "low" | "medium" | "high";
export type DashboardTransportMode = "auto" | "websocket" | "stream" | "polling";

type DashboardPreferencesState = {
  riskTier: DashboardRiskTier;
  selectedZoneId: string | null;
  highlightedZoneId: string | null;
  transportMode: DashboardTransportMode;
  lastRealtimeState: string;
};

type DashboardPreferencesContextValue = DashboardPreferencesState & {
  setRiskTier: (value: DashboardRiskTier) => void;
  setSelectedZoneId: (value: string | null) => void;
  setHighlightedZoneId: (value: string | null) => void;
  setTransportMode: (value: DashboardTransportMode) => void;
  setLastRealtimeState: (value: string) => void;
};

const DashboardPreferencesContext = React.createContext<DashboardPreferencesContextValue | null>(null);

export function DashboardPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [riskTier, setRiskTier] = React.useState<DashboardRiskTier>("all");
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null);
  const [highlightedZoneId, setHighlightedZoneId] = React.useState<string | null>(null);
  const [transportMode, setTransportMode] = React.useState<DashboardTransportMode>("auto");
  const [lastRealtimeState, setLastRealtimeState] = React.useState("idle");

  const value = React.useMemo<DashboardPreferencesContextValue>(
    () => ({
      riskTier,
      selectedZoneId,
      highlightedZoneId,
      transportMode,
      lastRealtimeState,
      setRiskTier,
      setSelectedZoneId,
      setHighlightedZoneId,
      setTransportMode,
      setLastRealtimeState,
    }),
    [highlightedZoneId, lastRealtimeState, riskTier, selectedZoneId, transportMode],
  );

  return (
    <DashboardPreferencesContext.Provider value={value}>
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

export const useDashboardPreferences = () => {
  const context = React.useContext(DashboardPreferencesContext);
  if (!context) {
    throw new Error("useDashboardPreferences must be used within DashboardPreferencesProvider.");
  }

  return context;
};
