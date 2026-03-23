import React from "react";

import {
  createPlanningDraftState,
  planningDraftReducer,
  type PlanningDraftMetrics,
  type PlanningDraftState,
  type PlanningDraftStatusTone,
  type RoutePoint,
} from "./planningDraft";

type PlanningDraftContextValue = {
  draft: PlanningDraftState;
  setName: (value: string) => void;
  setZoneId: (value: string) => void;
  setScheduledFor: (value: string) => void;
  setFillThresholdPercent: (value: number) => void;
  setAssignedAgentId: (value: string) => void;
  setOrderedRoute: (value: RoutePoint[]) => void;
  moveRouteItem: (index: number, direction: -1 | 1) => void;
  setCreatedTourId: (value: string | null) => void;
  setPlanCreated: (value: boolean) => void;
  setStatus: (message: string, tone: PlanningDraftStatusTone) => void;
  clearStatus: () => void;
  resetOptimization: () => void;
  setOptimizationMetrics: (value: PlanningDraftMetrics | null) => void;
};

const PlanningDraftContext = React.createContext<PlanningDraftContextValue | null>(null);

const toLocalDateTimeInputValue = (date: Date) => {
  const offsetInMilliseconds = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetInMilliseconds).toISOString().slice(0, 16);
};

export function PlanningDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, dispatch] = React.useReducer(
    planningDraftReducer,
    undefined,
    () => createPlanningDraftState(toLocalDateTimeInputValue(new Date())),
  );

  const value = React.useMemo<PlanningDraftContextValue>(
    () => ({
      draft,
      setName: (nextName) => dispatch({ type: "set-name", value: nextName }),
      setZoneId: (zoneId) => dispatch({ type: "set-zone", value: zoneId }),
      setScheduledFor: (scheduledFor) => dispatch({ type: "set-scheduled-for", value: scheduledFor }),
      setFillThresholdPercent: (value) =>
        dispatch({ type: "set-fill-threshold", value: Math.min(100, Math.max(0, value)) }),
      setAssignedAgentId: (assignedAgentId) =>
        dispatch({ type: "set-assigned-agent", value: assignedAgentId }),
      setOrderedRoute: (orderedRoute) => dispatch({ type: "set-ordered-route", value: orderedRoute }),
      moveRouteItem: (index, direction) => dispatch({ type: "move-route-item", index, direction }),
      setCreatedTourId: (value) => dispatch({ type: "set-created-tour", value }),
      setPlanCreated: (value) => dispatch({ type: "set-plan-created", value }),
      setStatus: (message, tone) => dispatch({ type: "set-status", message, tone }),
      clearStatus: () => dispatch({ type: "clear-status" }),
      resetOptimization: () => dispatch({ type: "reset-optimization" }),
      setOptimizationMetrics: (value) => dispatch({ type: "set-optimization-metrics", value }),
    }),
    [draft],
  );

  return <PlanningDraftContext.Provider value={value}>{children}</PlanningDraftContext.Provider>;
}

export const usePlanningDraftState = () => {
  const context = React.useContext(PlanningDraftContext);
  if (!context) {
    throw new Error("usePlanningDraftState must be used within PlanningDraftProvider.");
  }

  return context;
};
