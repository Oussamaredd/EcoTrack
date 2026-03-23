import { useEffect, useMemo, useRef } from "react";
import type { DivIcon, LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

import { useEmergencyCollection, usePlanningHeatmap, usePlanningNotifications } from "../../hooks/usePlanning";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL_TEMPLATE } from "../../lib/mapConfig";
import {
  useDashboardPreferences,
  type DashboardRiskTier,
} from "../../state/DashboardPreferencesContext";
import { useNotificationsFeed } from "../../state/NotificationsFeedContext";
import { reportMapRenderError } from "../../utils/errorHandlers";

type HeatmapPayload = {
  zoneSummaries?: Array<{
    zoneId: string;
    zoneName: string;
    averageRiskScore: number;
    riskTier: "low" | "medium" | "high";
    containerCount: number;
    latestWindowEnd: string | null;
    centroid?: { latitude: number; longitude: number } | null;
    countsByTier: { low: number; medium: number; high: number };
  }>;
  containerSignals?: Array<{
    containerId: string;
    code: string;
    label: string;
    zoneId: string | null;
    zoneName: string | null;
    latitude: number;
    longitude: number;
    fillLevelPercent: number;
    fillLevelDeltaPercent: number;
    sensorHealthScore: number;
    riskScore: number;
    riskTier: "low" | "medium" | "high";
    latestWindowEnd: string | null;
    status: string;
  }>;
  thresholds?: {
    lowMax?: number;
    mediumMax?: number;
    highMin?: number;
    criticalFillPercent?: number;
  };
};

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

const getTierColor = (tier: "low" | "medium" | "high") => {
  switch (tier) {
    case "high":
      return "#dc2626";
    case "medium":
      return "#ea580c";
    default:
      return "#16a34a";
  }
};

const formatUpdatedAt = (value?: string | null) => {
  if (!value) {
    return "No telemetry";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "No telemetry";
  }

  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildOverlaySignature = (signals: NonNullable<HeatmapPayload["containerSignals"]>) =>
  signals
    .map(
      (signal) =>
        `${signal.containerId}:${signal.latitude.toFixed(5)},${signal.longitude.toFixed(5)}:${signal.riskTier}:${signal.riskScore}`,
    )
    .join("|");

export default function ManagerHeatmapPanel({
  enabled,
}: {
  enabled: boolean;
}) {
  const {
    riskTier,
    selectedZoneId,
    highlightedZoneId,
    setRiskTier,
    setSelectedZoneId,
    setHighlightedZoneId,
  } = useDashboardPreferences();
  const { isDismissed, markDismissed } = useNotificationsFeed();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const overlayLayerRef = useRef<LayerGroup | null>(null);
  const markerIconRef = useRef<Map<string, DivIcon>>(new Map());
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);
  const heatmapQuery = usePlanningHeatmap(selectedZoneId, riskTier, enabled);
  const notificationsQuery = usePlanningNotifications(8, enabled);
  const emergencyCollectionMutation = useEmergencyCollection();
  const shouldUseStaticPreview = import.meta.env.MODE === "test";
  const heatmapData = (heatmapQuery.data as HeatmapPayload | undefined) ?? {};
  const zoneSummaries = heatmapData.zoneSummaries ?? [];
  const containerSignals = heatmapData.containerSignals ?? [];
  const visibleNotifications = ((notificationsQuery.data as { notifications?: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
  }> } | undefined)?.notifications ?? []).filter((notification) => !isDismissed(notification.id));
  const overlaySignature = useMemo(
    () => buildOverlaySignature(containerSignals),
    [containerSignals],
  );
  const fitBoundsPoints = useMemo(() => {
    if (containerSignals.length === 0) {
      return [PARIS_CENTER];
    }

    return containerSignals.map(
      (signal) => [signal.latitude, signal.longitude] as [number, number],
    );
  }, [containerSignals]);

  useEffect(() => {
    let isCancelled = false;

    const renderMap = async () => {
      try {
        if (shouldUseStaticPreview || !mapContainerRef.current) {
          return;
        }

        const L = leafletModuleRef.current ?? (await import("leaflet"));
        if (isCancelled || !mapContainerRef.current) {
          return;
        }

        leafletModuleRef.current = L;

        if (!mapRef.current) {
          const map = L.map(mapContainerRef.current, {
            zoomControl: true,
          });

          const tileLayer = L.tileLayer(MAP_TILE_URL_TEMPLATE, {
            attribution: MAP_TILE_ATTRIBUTION,
            maxZoom: 19,
            crossOrigin: true,
          });

          tileLayer.addTo(map);
          mapRef.current = map;
          tileLayerRef.current = tileLayer;
        }

        const map = mapRef.current;
        if (!map) {
          return;
        }

        if (overlayLayerRef.current) {
          overlayLayerRef.current.remove();
          overlayLayerRef.current = null;
        }

        const overlayLayer = L.layerGroup();

        containerSignals.forEach((signal) => {
          const color = getTierColor(signal.riskTier);
          const radiusMeters = 80 + signal.riskScore * 4;

          L.circle([signal.latitude, signal.longitude], {
            radius: radiusMeters,
            color,
            weight: signal.riskTier === "high" ? 2 : 1,
            fillColor: color,
            fillOpacity: signal.riskTier === "high" ? 0.28 : signal.riskTier === "medium" ? 0.18 : 0.12,
          })
            .bindTooltip(
              `${signal.code} - ${signal.label} (${signal.riskScore}/100)`,
              { direction: "top", opacity: 0.95 },
            )
            .addTo(overlayLayer);
        });

        zoneSummaries.forEach((zone) => {
          if (!zone.centroid) {
            return;
          }

          const iconCacheKey = `${zone.zoneId}:${zone.riskTier}`;
          let labelIcon = markerIconRef.current.get(iconCacheKey);
          if (!labelIcon) {
            labelIcon = L.divIcon({
              className: `dashboard-heatmap-label dashboard-heatmap-label-${zone.riskTier}`,
              html: `<span>${zone.zoneName}</span>`,
              iconSize: [120, 28],
              iconAnchor: [60, 14],
            });
            markerIconRef.current.set(iconCacheKey, labelIcon);
          }

          L.marker([zone.centroid.latitude, zone.centroid.longitude], {
            icon: labelIcon,
            keyboard: false,
          }).addTo(overlayLayer);
        });

        overlayLayer.addTo(map);
        overlayLayerRef.current = overlayLayer;

        const bounds = L.latLngBounds(fitBoundsPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [24, 24],
            maxZoom: 14,
          });
        }
      } catch (error) {
        reportMapRenderError(error);
      }
    };

    void renderMap();

    return () => {
      isCancelled = true;
    };
  }, [containerSignals, fitBoundsPoints, overlaySignature, shouldUseStaticPreview, zoneSummaries]);

  useEffect(
    () => () => {
      overlayLayerRef.current = null;
      tileLayerRef.current = null;
      markerIconRef.current.clear();
      const existingMap = mapRef.current;
      mapRef.current = null;
      existingMap?.remove();
    },
    [],
  );

  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel-header">
        <div>
          <h2>Overflow heatmap</h2>
          <p>
            Rule-based risk tiers from recent 10-minute rollups. Critical fill threshold{" "}
            {heatmapData.thresholds?.criticalFillPercent ?? 80}%.
          </p>
        </div>
        <div className="dashboard-heatmap-filters">
          <label className="dashboard-heatmap-filter">
            <span>Zone</span>
            <select
              value={selectedZoneId ?? ""}
              onChange={(event) => setSelectedZoneId(event.target.value || null)}
            >
              <option value="">All zones</option>
              {zoneSummaries.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.zoneName}
                </option>
              ))}
            </select>
          </label>
          <label className="dashboard-heatmap-filter">
            <span>Risk</span>
            <select
              value={riskTier}
              onChange={(event) => setRiskTier(event.target.value as DashboardRiskTier)}
            >
              <option value="all">All tiers</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
      </header>

      <div className="dashboard-heatmap-legend" aria-label="Heatmap legend">
        <span><i className="dashboard-heatmap-swatch dashboard-heatmap-swatch-low" /> Low risk</span>
        <span><i className="dashboard-heatmap-swatch dashboard-heatmap-swatch-medium" /> Medium risk</span>
        <span><i className="dashboard-heatmap-swatch dashboard-heatmap-swatch-high" /> High risk</span>
      </div>

      {heatmapQuery.isLoading ? (
        <p className="dashboard-empty-state">Loading zone risk overlay...</p>
      ) : heatmapQuery.isError ? (
        <p className="dashboard-empty-state">
          {heatmapQuery.error instanceof Error
            ? heatmapQuery.error.message
            : "Heatmap data is temporarily unavailable."}
        </p>
      ) : containerSignals.length === 0 ? (
        <p className="dashboard-empty-state">No mapped risk signals are available for this filter.</p>
      ) : shouldUseStaticPreview ? (
        <div className="dashboard-heatmap-static" role="img" aria-label="Static dashboard heatmap preview">
          <p>Leaflet heatmap preview is disabled in automated tests.</p>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="dashboard-heatmap-map"
          role="img"
          aria-label="Manager overflow heatmap"
        />
      )}

      <div className="dashboard-heatmap-grid">
        <section>
          <h3 className="dashboard-subheading">Zone summary</h3>
          <ul className="dashboard-zone-summary-list">
            {zoneSummaries.slice(0, 6).map((zone) => (
              <li
                key={zone.zoneId}
                className={`dashboard-zone-summary-item ${
                  highlightedZoneId === zone.zoneId ? "dashboard-zone-summary-item-active" : ""
                }`}
              >
                <button
                  type="button"
                  className="dashboard-zone-summary-button"
                  onClick={() => {
                    setHighlightedZoneId(zone.zoneId);
                    setSelectedZoneId(zone.zoneId === selectedZoneId ? null : zone.zoneId);
                  }}
                >
                  <span>
                    <strong>{zone.zoneName}</strong>
                    <small>{zone.containerCount} mapped containers</small>
                  </span>
                  <span className={`dashboard-zone-tier dashboard-zone-tier-${zone.riskTier}`}>
                    {zone.averageRiskScore}/100
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="dashboard-subheading">Highest-risk containers</h3>
          <ul className="dashboard-ticket-feed">
            {containerSignals.slice(0, 6).map((signal) => (
              <li key={signal.containerId} className="dashboard-ticket-item">
                <div className="dashboard-ticket-details">
                  <p className="dashboard-ticket-name">
                    {signal.code} - {signal.label}
                  </p>
                  <p className="dashboard-ticket-meta">
                    {signal.zoneName ?? "Unassigned"} - Fill {signal.fillLevelPercent}% - Risk {signal.riskScore}/100
                  </p>
                  <p className="dashboard-ticket-meta">
                    Latest rollup {formatUpdatedAt(signal.latestWindowEnd)} - Sensor health {signal.sensorHealthScore}%
                  </p>
                </div>
                <button
                  type="button"
                  className="dashboard-ticket-status dashboard-ticket-status-open"
                  onClick={() =>
                    emergencyCollectionMutation.mutate({
                      containerId: signal.containerId,
                      reason: "Triggered by manager dashboard heatmap high-risk signal",
                    })
                  }
                  disabled={emergencyCollectionMutation.isPending || signal.riskTier !== "high"}
                >
                  Emergency
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {enabled ? (
        <section className="dashboard-heatmap-notifications">
          <h3 className="dashboard-subheading">Notification feed</h3>
          {visibleNotifications.length === 0 ? (
            <p className="dashboard-empty-state">No unread planning notifications right now.</p>
          ) : (
            <ul className="dashboard-ticket-feed">
              {visibleNotifications.map((notification) => (
                <li key={notification.id} className="dashboard-ticket-item">
                  <div className="dashboard-ticket-details">
                    <p className="dashboard-ticket-name">{notification.title}</p>
                    <p className="dashboard-ticket-meta">{notification.body}</p>
                    <p className="dashboard-ticket-meta">
                      {notification.status} - {formatUpdatedAt(notification.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-ticket-status dashboard-ticket-status-completed"
                    onClick={() => markDismissed(notification.id)}
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </article>
  );
}
