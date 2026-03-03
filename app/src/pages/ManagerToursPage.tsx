import { useMemo, useState } from "react";

import { useManagerToursList, useRebuildTourRoute } from "../hooks/usePlanning";
import "../styles/OperationsPages.css";

type ManagerTourRecord = {
  id: string;
  name: string;
  status: string;
  scheduledFor?: string | Date | null;
  zoneName?: string | null;
  assignedAgentId?: string | null;
  updatedAt?: string | Date | null;
};

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallbackMessage;

const formatStatusLabel = (status?: string | null) => {
  if (!status || status.trim().length === 0) {
    return "Unknown";
  }

  return status
    .trim()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

export default function ManagerToursPage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">("info");
  const [rebuildingTourId, setRebuildingTourId] = useState<string | null>(null);

  const toursQuery = useManagerToursList();
  const rebuildRouteMutation = useRebuildTourRoute();

  const tours = useMemo(
    () => (((toursQuery.data as { tours?: ManagerTourRecord[] } | undefined)?.tours ?? [])),
    [toursQuery.data],
  );
  const pagination = (toursQuery.data as { pagination?: { total?: number } } | undefined)?.pagination;

  const clearStatus = () => {
    setStatusMessage("");
  };

  const rebuildTourRoute = async (tour: ManagerTourRecord) => {
    clearStatus();
    setRebuildingTourId(tour.id);

    try {
      const response = (await rebuildRouteMutation.mutateAsync(tour.id)) as {
        routeGeometry?: {
          source?: string;
          provider?: string;
        };
      };
      const routeSource =
        response.routeGeometry?.source === "live" ? "road route" : "fallback route";
      const providerLabel =
        typeof response.routeGeometry?.provider === "string" &&
        response.routeGeometry.provider.trim().length > 0
          ? response.routeGeometry.provider.trim()
          : "the configured routing provider";

      setStatusTone("success");
      setStatusMessage(
        `Stored route rebuilt for ${tour.name}. Latest persisted result is a ${routeSource} from ${providerLabel}.`,
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(getErrorMessage(error, "Failed to rebuild the stored route."));
    } finally {
      setRebuildingTourId(null);
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Tour Operations</h1>
        <p>
          Review scheduled tours, then rebuild any persisted route without changing stop
          assignments or collection history.
        </p>
      </header>

      <article className="ops-card">
        <h2>Tour Queue</h2>
        <p className="ops-card-intro">
          {pagination?.total && pagination.total > tours.length
            ? `Showing the first ${tours.length} tours out of ${pagination.total}.`
            : `Showing ${tours.length} tour${tours.length === 1 ? "" : "s"} from the current schedule queue.`}
        </p>

        {toursQuery.isLoading ? (
          <p className="ops-empty ops-mt-sm">Loading tours...</p>
        ) : null}

        {toursQuery.isError ? (
          <div className="ops-mt-sm">
            <p className="ops-status ops-status-error" role="status" aria-live="polite">
              Unable to load tours: {getErrorMessage(toursQuery.error, "Unknown error.")}
            </p>
            <div className="ops-actions ops-mt-xs">
              <button
                type="button"
                className="ops-btn ops-btn-outline"
                onClick={() => toursQuery.refetch()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {!toursQuery.isLoading && !toursQuery.isError && tours.length === 0 ? (
          <p className="ops-empty ops-mt-sm">No tours are available to rebuild right now.</p>
        ) : null}

        {!toursQuery.isLoading && !toursQuery.isError && tours.length > 0 ? (
          <ul className="ops-list ops-mt-sm">
            {tours.map((tour) => {
              const isRebuilding = rebuildingTourId === tour.id && rebuildRouteMutation.isPending;
              return (
                <li key={tour.id} className="ops-list-item">
                  <p>
                    <strong>{tour.name}</strong>
                  </p>
                  <p className="ops-list-meta">Status: {formatStatusLabel(tour.status)}</p>
                  <p className="ops-list-meta">
                    Scheduled: {formatDateTime(tour.scheduledFor)}
                  </p>
                  <p className="ops-list-meta">
                    Zone: {tour.zoneName?.trim() ? tour.zoneName : "Unassigned zone"}
                  </p>
                  <p className="ops-list-meta">
                    Assignment: {tour.assignedAgentId ? "Assigned" : "Unassigned"}
                  </p>
                  <p className="ops-list-meta">
                    Last update: {formatDateTime(tour.updatedAt)}
                  </p>

                  <div className="ops-actions ops-mt-xs">
                    <button
                      type="button"
                      className="ops-btn ops-btn-outline"
                      onClick={() => rebuildTourRoute(tour)}
                      disabled={rebuildRouteMutation.isPending}
                      aria-label={`Rebuild route for ${tour.name}`}
                    >
                      {isRebuilding ? "Rebuilding..." : "Rebuild Route"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </article>

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "ops-status ops-status-success"
              : statusTone === "info"
                ? "ops-status ops-status-info"
                : "ops-status ops-status-error"
          }
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
