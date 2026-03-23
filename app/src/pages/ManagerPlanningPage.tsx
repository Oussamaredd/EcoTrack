import { useMemo } from "react";
import {
  useCreatePlannedTour,
  useOptimizeTourPlan,
  usePlanningAgents,
  usePlanningZones,
  useRebuildTourRoute,
} from "../hooks/usePlanning";
import { usePlanningDraftState } from "../state/PlanningDraftContext";
import type { RoutePoint } from "../state/planningDraft";
import "../styles/OperationsPages.css";

type Zone = { id: string; name: string };
type Agent = { id: string; displayName?: string | null; email: string };

const toScheduledIsoString = (value: string) => {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallbackMessage;

export default function ManagerPlanningPage() {
  const {
    draft,
    setName,
    setZoneId,
    setScheduledFor,
    setFillThresholdPercent,
    setAssignedAgentId,
    setOrderedRoute,
    moveRouteItem,
    setCreatedTourId,
    setPlanCreated,
    setStatus,
    clearStatus,
    resetOptimization,
    setOptimizationMetrics,
  } = usePlanningDraftState();
  const zonesQuery = usePlanningZones();
  const agentsQuery = usePlanningAgents();
  const optimizeMutation = useOptimizeTourPlan();
  const createMutation = useCreatePlannedTour();
  const rebuildRouteMutation = useRebuildTourRoute();

  const zones = ((zonesQuery.data as { zones?: Zone[] } | undefined)?.zones ?? []);
  const agents = ((agentsQuery.data as { agents?: Agent[] } | undefined)?.agents ?? []);

  const optimizationMetrics = useMemo(
    () =>
      draft.optimizationMetrics ??
      ((optimizeMutation.data as {
        metrics?: { totalDistanceKm?: number; estimatedDurationMinutes?: number };
      } | undefined)?.metrics ?? null),
    [draft.optimizationMetrics, optimizeMutation.data],
  );

  const scheduledForIsoString = toScheduledIsoString(draft.scheduledFor);
  const zonePlaceholderLabel = zonesQuery.isLoading
    ? "Loading zones..."
    : zonesQuery.isError
      ? "Unable to load zones"
      : "Select zone";
  const agentPlaceholderLabel = agentsQuery.isLoading
    ? "Loading agents..."
    : agentsQuery.isError
      ? "Unable to load agents"
      : "Unassigned";

  const resetOptimizationState = () => {
    resetOptimization();
    optimizeMutation.reset?.();
  };

  const optimizeRoute = async () => {
    if (!draft.zoneId) {
      setStatus("Select a zone before optimizing.", "error");
      return;
    }

    if (!scheduledForIsoString) {
      setStatus("Enter a valid schedule before optimizing.", "error");
      return;
    }

    clearStatus();
    setPlanCreated(false);
    setCreatedTourId(null);

    try {
      const response = (await optimizeMutation.mutateAsync({
        zoneId: draft.zoneId,
        scheduledFor: scheduledForIsoString,
        fillThresholdPercent: draft.fillThresholdPercent,
      })) as {
        route?: RoutePoint[];
        metrics?: {
          totalDistanceKm?: number;
          estimatedDurationMinutes?: number;
          deferredForNearbyTours?: number;
        };
      };

      const nextRoute = Array.isArray(response.route) ? response.route : [];
      const deferredForNearbyTours = response.metrics?.deferredForNearbyTours ?? 0;
      setOrderedRoute(nextRoute);
      setOptimizationMetrics({
        totalDistanceKm: response.metrics?.totalDistanceKm,
        estimatedDurationMinutes: response.metrics?.estimatedDurationMinutes,
      });

      if (nextRoute.length === 0) {
        setStatus(
          deferredForNearbyTours > 0
            ? "All matching containers are already planned on nearby tours for this schedule. Pick another time or adjust the threshold."
            : "No containers match this zone and fill threshold yet.",
          "info",
        );
        return;
      }

      setStatus(
        deferredForNearbyTours > 0
          ? `Route generated. ${deferredForNearbyTours} matching container${
              deferredForNearbyTours === 1 ? " was" : "s were"
            } skipped because ${
              deferredForNearbyTours === 1 ? "it is" : "they are"
            } already planned on nearby tours.`
          : "Route generated. Review the stop order, then create the tour.",
        "success",
      );
    } catch (error) {
      setOrderedRoute([]);
      setOptimizationMetrics(null);
      setStatus(getErrorMessage(error, "Failed to optimize the route."), "error");
    }
  };

  const submitTour = async () => {
    if (draft.orderedRoute.length === 0 || !draft.zoneId) {
      setStatus("Optimize route first before creating tour.", "error");
      return;
    }

    if (draft.name.trim().length === 0) {
      setStatus("Enter a tour name before creating the tour.", "error");
      return;
    }

    if (!scheduledForIsoString) {
      setStatus("Enter a valid schedule before creating the tour.", "error");
      return;
    }

    clearStatus();

    try {
      const createdTour = (await createMutation.mutateAsync({
        name: draft.name.trim(),
        zoneId: draft.zoneId,
        scheduledFor: scheduledForIsoString,
        assignedAgentId: draft.assignedAgentId || undefined,
        orderedContainerIds: draft.orderedRoute.map((item) => item.id),
      })) as { id?: string };

      setPlanCreated(true);
      setCreatedTourId(typeof createdTour?.id === "string" ? createdTour.id : null);
      setStatus(
        draft.assignedAgentId
          ? "Planned tour created and assigned successfully."
          : "Planned tour created successfully.",
        "success",
      );
    } catch (error) {
      setPlanCreated(false);
      setStatus(getErrorMessage(error, "Failed to create planned tour."), "error");
    }
  };

  const rebuildStoredRoute = async () => {
    if (!draft.lastCreatedTourId) {
      setStatus("Create a tour first before rebuilding its stored route.", "error");
      return;
    }

    clearStatus();

    try {
      const response = (await rebuildRouteMutation.mutateAsync(draft.lastCreatedTourId)) as {
        routeGeometry?: { source?: string };
      };
      const routeSource = response.routeGeometry?.source === "live" ? "road route" : "fallback route";

      setStatus(
        `Stored route rebuilt successfully. Latest persisted result is a ${routeSource}.`,
        "success",
      );
    } catch (error) {
      setStatus(getErrorMessage(error, "Failed to rebuild the stored route."), "error");
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Tour Planning Wizard</h1>
        <p>
          Configure zone, threshold, and schedule to prepare a route plan, then
          optionally assign an agent before creating the tour.
        </p>
      </header>

      <article className="ops-card ops-form">
        <div className="ops-grid ops-grid-2 sm:grid-cols-2">
          <div className="ops-field">
            <label htmlFor="manager-planning-tour-name" className="ops-label">
              Tour name
            </label>
            <input
              id="manager-planning-tour-name"
              className="ops-input"
              value={draft.name}
              onChange={(event) => {
                clearStatus();
                optimizeMutation.reset?.();
                setName(event.target.value);
              }}
            />
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-scheduled-for" className="ops-label">
              Scheduled date/time
            </label>
            <input
              id="manager-planning-scheduled-for"
              type="datetime-local"
              className="ops-input"
              aria-describedby="manager-planning-scheduled-for-help"
              value={draft.scheduledFor}
              onChange={(event) => {
                clearStatus();
                setScheduledFor(event.target.value);
                resetOptimizationState();
              }}
            />
            <p id="manager-planning-scheduled-for-help" className="ops-subtle">
              Uses your local time and also avoids containers already reserved on
              nearby tours for the selected schedule.
            </p>
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-zone" className="ops-label">
              Zone
            </label>
            <select
              id="manager-planning-zone"
              className="ops-select"
              value={draft.zoneId}
              disabled={zonesQuery.isLoading || zonesQuery.isError}
              onChange={(event) => {
                clearStatus();
                setZoneId(event.target.value);
                resetOptimizationState();
              }}
            >
              <option value="">{zonePlaceholderLabel}</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            {zonesQuery.isError ? (
              <p className="ops-subtle" role="status" aria-live="polite">
                Zone data could not be loaded. Refresh the page and try again.
              </p>
            ) : null}
            {!zonesQuery.isLoading && !zonesQuery.isError && zones.length === 0 ? (
              <p className="ops-subtle">No zones are available yet.</p>
            ) : null}
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-fill-threshold" className="ops-label">
              Fill threshold (%)
            </label>
            <input
              id="manager-planning-fill-threshold"
              type="number"
              min={0}
              max={100}
              className="ops-input"
              value={draft.fillThresholdPercent}
              onChange={(event) => {
                clearStatus();
                setFillThresholdPercent(Number(event.target.value) || 0);
                resetOptimizationState();
              }}
            />
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-assigned-agent" className="ops-label">
              Assign agent
            </label>
            <select
              id="manager-planning-assigned-agent"
              className="ops-select"
              value={draft.assignedAgentId}
              disabled={agentsQuery.isLoading}
              onChange={(event) => {
                clearStatus();
                setAssignedAgentId(event.target.value);
              }}
            >
              <option value="">{agentPlaceholderLabel}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName || agent.email}
                </option>
              ))}
            </select>
            {agentsQuery.isError ? (
              <p className="ops-subtle" role="status" aria-live="polite">
                Agent data could not be loaded. You can still create the tour
                without assigning anyone yet.
              </p>
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.length === 0 ? (
              <p className="ops-subtle">
                No active agents are available right now. The tour can stay
                unassigned.
              </p>
            ) : null}
          </div>
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-primary"
            onClick={optimizeRoute}
            disabled={
              optimizeMutation.isPending || zonesQuery.isLoading || zonesQuery.isError
            }
          >
            {optimizeMutation.isPending ? "Optimizing..." : "Run Optimization"}
          </button>

          <button
            type="button"
            className="ops-btn ops-btn-success"
            onClick={submitTour}
            disabled={
              createMutation.isPending || draft.orderedRoute.length === 0 || draft.planCreated
            }
          >
            {createMutation.isPending
              ? "Creating..."
              : draft.planCreated
                ? "Tour Created"
                : "Create Planned Tour"}
          </button>

          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={rebuildStoredRoute}
            disabled={!draft.lastCreatedTourId || rebuildRouteMutation.isPending}
          >
            {rebuildRouteMutation.isPending ? "Rebuilding..." : "Rebuild Stored Route"}
          </button>
        </div>

        {draft.lastCreatedTourId ? (
          <p className="ops-subtle">
            Last created tour: {draft.lastCreatedTourId}. Use the rebuild action to refresh the persisted route
            without editing the stops.
          </p>
        ) : null}
      </article>

      <article className="ops-card">
        <h2>Optimized Route</h2>
        {optimizationMetrics ? (
          <p className="ops-card-intro">
            Estimated distance: {optimizationMetrics.totalDistanceKm ?? 0} km -
            Estimated duration: {optimizationMetrics.estimatedDurationMinutes ?? 0} min
          </p>
        ) : null}

        {draft.orderedRoute.length === 0 ? (
          <p className="ops-empty ops-mt-sm">
            Run optimization to generate candidate route order.
          </p>
        ) : (
          <ul className="ops-list ops-mt-sm">
            {draft.orderedRoute.map((item, index) => (
              <li key={item.id} className="ops-list-item">
                <p>
                  <strong>#{index + 1}</strong> - {item.code} - {item.label}
                </p>
                <p className="ops-list-meta">Fill level: {item.fillLevelPercent}%</p>

                <div className="ops-actions ops-mt-xs">
                  <button
                    type="button"
                    className="ops-btn ops-btn-outline"
                    onClick={() => {
                      clearStatus();
                      moveRouteItem(index, -1);
                    }}
                    disabled={index === 0}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn-outline"
                    onClick={() => {
                      clearStatus();
                      moveRouteItem(index, 1);
                    }}
                    disabled={index === draft.orderedRoute.length - 1}
                  >
                    Down
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      {draft.statusMessage ? (
        <p
          className={
            draft.statusTone === "success"
              ? "ops-status ops-status-success"
              : draft.statusTone === "info"
                ? "ops-status ops-status-info"
                : "ops-status ops-status-error"
          }
          role="status"
          aria-live="polite"
        >
          {draft.statusMessage}
        </p>
      ) : null}
    </section>
  );
}
