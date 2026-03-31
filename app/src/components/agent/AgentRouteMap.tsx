import { useEffect, useMemo, useRef } from "react";
import type { DivIcon, LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { GeoJsonLineString, TourRouteGeometry } from "../../hooks/useAgentTours";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL_TEMPLATE } from "../../lib/mapConfig";

type RouteStop = {
  id: string;
  stopOrder: number;
  status: string;
  containerCode: string;
  containerLabel: string;
  latitude?: string | null;
  longitude?: string | null;
};

type ZoneContainer = {
  id: string;
  code: string;
  label: string;
  status: string;
  latitude?: string | null;
  longitude?: string | null;
};

type AgentRouteMapProps = {
  stops: RouteStop[];
  routeGeometry?: TourRouteGeometry | null;
  zoneContainers?: ZoneContainer[];
  showZoneContainers?: boolean;
};

type NormalizedRouteStop = {
  id: string;
  stopOrder: number;
  status: string;
  containerCode: string;
  containerLabel: string;
  latitude: number;
  longitude: number;
};

type NormalizedZoneContainer = {
  id: string;
  code: string;
  label: string;
  status: string;
  latitude: number;
  longitude: number;
};

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

const toNumberOrNull = (value: string | null | undefined) => {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (status: string) => status.trim().toLowerCase();

const normalizeStops = (stops: RouteStop[]) =>
  stops
    .map((stop) => {
      const latitude = toNumberOrNull(stop.latitude);
      const longitude = toNumberOrNull(stop.longitude);

      if (latitude == null || longitude == null) {
        return null;
      }

      return {
        ...stop,
        latitude,
        longitude,
      } satisfies NormalizedRouteStop;
    })
    .filter((stop): stop is NormalizedRouteStop => stop != null)
    .sort((left, right) => left.stopOrder - right.stopOrder);

const normalizeZoneContainers = (containers: ZoneContainer[]) =>
  containers
    .map((container) => {
      const latitude = toNumberOrNull(container.latitude);
      const longitude = toNumberOrNull(container.longitude);

      if (latitude == null || longitude == null) {
        return null;
      }

      return {
        ...container,
        latitude,
        longitude,
      } satisfies NormalizedZoneContainer;
    })
    .filter((container): container is NormalizedZoneContainer => container != null)
    .sort((left, right) => left.code.localeCompare(right.code));

const buildFallbackLineString = (stops: NormalizedRouteStop[]): GeoJsonLineString | null =>
  stops.length >= 2
    ? {
        type: "LineString",
        coordinates: stops.map((stop) => [stop.longitude, stop.latitude]),
      }
    : null;

const toLatLngPath = (geometry: GeoJsonLineString | null) =>
  geometry?.coordinates
    .filter(
      (coordinate): coordinate is [number, number] =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]),
    )
    .map((coordinate) => [coordinate[1], coordinate[0]] as [number, number]) ?? [];

const buildOverlaySignature = (
  stops: NormalizedRouteStop[],
  geometry: GeoJsonLineString | null,
  geometrySource: string,
  offRouteContainers: NormalizedZoneContainer[],
) =>
  [
    stops
      .map(
        (stop) =>
          `${stop.id}:${stop.stopOrder}:${stop.latitude.toFixed(6)},${stop.longitude.toFixed(6)}:${stop.status}`,
      )
      .join("|"),
    geometrySource,
    geometry?.coordinates
      .map((coordinate) => `${coordinate[0].toFixed(6)},${coordinate[1].toFixed(6)}`)
      .join("|") ?? "no-geometry",
    offRouteContainers
      .map((container) => `${container.id}:${container.latitude.toFixed(6)},${container.longitude.toFixed(6)}`)
      .join("|") || "no-off-route-containers",
  ].join("::");

const getMarkerTheme = (status: string) => {
  switch (normalizeStatus(status)) {
    case "completed":
      return {
        fill: "#49d9a2",
        stroke: "#0c3c2c",
        className: "ops-stop-marker ops-stop-marker-completed",
      };
    case "active":
      return {
        fill: "#ffd166",
        stroke: "#4d3b00",
        className: "ops-stop-marker ops-stop-marker-active",
      };
    default:
      return {
        fill: "#2bd4a8",
        stroke: "#093c32",
        className: "ops-stop-marker ops-stop-marker-pending",
      };
  }
};

export default function AgentRouteMap({
  stops,
  routeGeometry,
  zoneContainers = [],
  showZoneContainers = false,
}: AgentRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const overlayLayerRef = useRef<LayerGroup | null>(null);
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);
  const markerIconRef = useRef<Map<string, DivIcon>>(new Map());

  const normalizedStops = useMemo(() => normalizeStops(stops), [stops]);
  const normalizedZoneContainers = useMemo(
    () => normalizeZoneContainers(zoneContainers),
    [zoneContainers],
  );
  const offRouteZoneContainers = useMemo(() => {
    const stopIds = new Set(normalizedStops.map((stop) => stop.id));
    return normalizedZoneContainers.filter((container) => !stopIds.has(container.id));
  }, [normalizedStops, normalizedZoneContainers]);
  const displayGeometry = useMemo(
    () => routeGeometry?.geometry ?? buildFallbackLineString(normalizedStops),
    [normalizedStops, routeGeometry],
  );
  const shouldUseStaticPreview = import.meta.env.MODE === "test";
  const routePath = useMemo(() => toLatLngPath(displayGeometry), [displayGeometry]);
  const fitBoundsPoints = useMemo(() => {
    const zoneReferencePoints =
      showZoneContainers && offRouteZoneContainers.length > 0
        ? offRouteZoneContainers.map(
            (container) => [container.latitude, container.longitude] as [number, number],
          )
        : [];

    if (routePath.length > 0) {
      return zoneReferencePoints.length > 0 ? [...routePath, ...zoneReferencePoints] : routePath;
    }

    if (normalizedStops.length > 0) {
      const stopPoints = normalizedStops.map(
        (stop) => [stop.latitude, stop.longitude] as [number, number],
      );
      return zoneReferencePoints.length > 0 ? [...stopPoints, ...zoneReferencePoints] : stopPoints;
    }

    if (zoneReferencePoints.length > 0) {
      return zoneReferencePoints;
    }

    return [PARIS_CENTER];
  }, [normalizedStops, offRouteZoneContainers, routePath, showZoneContainers]);
  const overlaySignature = useMemo(
    () =>
      buildOverlaySignature(
        normalizedStops,
        displayGeometry,
        routeGeometry?.source ?? "fallback",
        showZoneContainers ? offRouteZoneContainers : [],
      ),
    [displayGeometry, normalizedStops, offRouteZoneContainers, routeGeometry?.source, showZoneContainers],
  );

  useEffect(() => {
    let isCancelled = false;

    const renderMap = async () => {
      if (shouldUseStaticPreview) {
        return;
      }

      if (!mapContainerRef.current) {
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

      if (routePath.length >= 2) {
        const shadowLine = L.polyline(routePath, {
          color: "#081225",
          weight: 8,
          opacity: 0.28,
          lineCap: "round",
          lineJoin: "round",
        });
        const primaryLine = L.polyline(routePath, {
          color: "#2f7bff",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        });

        shadowLine.addTo(overlayLayer);
        primaryLine.addTo(overlayLayer);
      }

      if (showZoneContainers) {
        offRouteZoneContainers.forEach((container) => {
          const referenceMarker = L.circleMarker([container.latitude, container.longitude], {
            radius: 5,
            fillColor: "#93a7c3",
            fillOpacity: 0.55,
            color: "#21314d",
            weight: 1.5,
          });

          referenceMarker.bindTooltip(
            `Zone container ${container.code} - ${container.label} (not on this route)`,
            {
              direction: "top",
              offset: [0, -6],
              opacity: 0.95,
            },
          );
          referenceMarker.addTo(overlayLayer);
        });
      }

      normalizedStops.forEach((stop) => {
        const markerTheme = getMarkerTheme(stop.status);
        const circle = L.circleMarker([stop.latitude, stop.longitude], {
          radius: 7,
          fillColor: markerTheme.fill,
          fillOpacity: 0.95,
          color: markerTheme.stroke,
          weight: 2,
        });

        circle.bindTooltip(`#${stop.stopOrder} ${stop.containerCode} - ${stop.containerLabel}`, {
          direction: "top",
          offset: [0, -8],
          opacity: 0.95,
        });
        circle.addTo(overlayLayer);

        const iconCacheKey = `${markerTheme.className}:${stop.stopOrder}`;
        let labelIcon = markerIconRef.current.get(iconCacheKey);
        if (!labelIcon) {
          labelIcon = L.divIcon({
            className: markerTheme.className,
            html: `<span>${stop.stopOrder}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          markerIconRef.current.set(iconCacheKey, labelIcon);
        }

        const labelMarker = L.marker([stop.latitude, stop.longitude], {
          icon: labelIcon,
          keyboard: false,
          interactive: false,
        });
        labelMarker.addTo(overlayLayer);
      });

      overlayLayer.addTo(map);
      overlayLayerRef.current = overlayLayer;

      const bounds = L.latLngBounds(fitBoundsPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [28, 28],
          maxZoom: normalizedStops.length <= 1 ? 16 : 15,
        });
      }
    };

    void renderMap();

    return () => {
      isCancelled = true;
    };
  }, [fitBoundsPoints, normalizedStops.length, overlaySignature, routePath, shouldUseStaticPreview]);

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

  if (shouldUseStaticPreview) {
    return (
      <div className="ops-route-map-shell">
        <div
          className="ops-route-map-leaflet ops-route-map-static"
          role="img"
          aria-label="Leaflet route map with road-snapped geometry"
        >
          <p className="ops-route-map-static-label">
            Leaflet preview is disabled in automated tests. Route rendering is validated in the browser.
          </p>
        </div>

        <div className="ops-route-map-legend" aria-hidden="true">
          <span>Leaflet basemap</span>
          <span>Static test preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-route-map-shell">
      <div
        ref={mapContainerRef}
        className="ops-route-map-leaflet"
        role="img"
        aria-label="Leaflet route map with road-snapped geometry"
      />

      <div className="ops-route-map-legend" aria-hidden="true">
        <span>Leaflet basemap</span>
        {showZoneContainers && offRouteZoneContainers.length > 0 ? (
          <span>Off-route zone containers</span>
        ) : null}
        <span>
          {routeGeometry?.source === "live"
            ? "Stored road route"
            : routePath.length >= 2
              ? "Stored fallback route"
              : "Paris focus view"}
        </span>
      </div>
    </div>
  );
}
