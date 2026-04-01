import { useEffect, useMemo, useRef } from "react";
import type { DivIcon, LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

import type {
  GeoJsonLineString,
  TourRouteGeometry,
  ZoneContainerData,
} from "../../hooks/useAgentTours";
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

type DepotLocation = {
  label?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type AgentRouteMapProps = {
  stops: RouteStop[];
  zoneContainers?: ZoneContainerData[];
  depot?: DepotLocation | null;
  routeGeometry?: TourRouteGeometry | null;
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

type NormalizedVisibleContainer = {
  id: string;
  code: string;
  label: string;
  status: string;
  latitude: number;
  longitude: number;
  stopOrder: number | null;
  isRouted: boolean;
};

type NormalizedDepot = {
  label: string;
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

const normalizeDepot = (depot: DepotLocation | null | undefined): NormalizedDepot | null => {
  const latitude = toNumberOrNull(depot?.latitude);
  const longitude = toNumberOrNull(depot?.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    label: depot?.label?.trim() || "Zone depot",
    latitude,
    longitude,
  };
};

const normalizeVisibleContainers = (
  stops: NormalizedRouteStop[],
  zoneContainers: ZoneContainerData[],
) => {
  const visibleContainers = new Map<string, NormalizedVisibleContainer>();

  zoneContainers.forEach((container) => {
    const latitude = toNumberOrNull(container.latitude);
    const longitude = toNumberOrNull(container.longitude);

    if (latitude == null || longitude == null) {
      return;
    }

    visibleContainers.set(container.id, {
      id: container.id,
      code: container.code,
      label: container.label,
      status: container.status,
      latitude,
      longitude,
      stopOrder: null,
      isRouted: false,
    });
  });

  stops.forEach((stop) => {
    visibleContainers.set(stop.id, {
      id: stop.id,
      code: stop.containerCode,
      label: stop.containerLabel,
      status: stop.status,
      latitude: stop.latitude,
      longitude: stop.longitude,
      stopOrder: stop.stopOrder,
      isRouted: true,
    });
  });

  return Array.from(visibleContainers.values()).sort((left, right) => {
    if (left.isRouted && right.isRouted) {
      return (left.stopOrder ?? 0) - (right.stopOrder ?? 0);
    }

    if (left.isRouted) {
      return -1;
    }

    if (right.isRouted) {
      return 1;
    }

    return left.code.localeCompare(right.code);
  });
};

const buildFallbackLineString = (
  stops: NormalizedRouteStop[],
  depot: NormalizedDepot | null,
): GeoJsonLineString | null => {
  const routePoints = [
    ...(depot ? [[depot.longitude, depot.latitude] as [number, number]] : []),
    ...stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]),
  ];

  return routePoints.length >= 2
    ? {
        type: "LineString",
        coordinates: routePoints,
      }
    : null;
};

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
  visibleContainers: NormalizedVisibleContainer[],
  geometry: GeoJsonLineString | null,
  geometrySource: string,
  depot: NormalizedDepot | null,
) =>
  [
    visibleContainers
      .map(
        (container) =>
          `${container.id}:${container.stopOrder ?? "mapped"}:${container.latitude.toFixed(6)},${container.longitude.toFixed(6)}:${container.status}`,
      )
      .join("|"),
    depot ? `${depot.label}:${depot.latitude.toFixed(6)},${depot.longitude.toFixed(6)}` : "no-depot",
    geometrySource,
    geometry?.coordinates
      .map((coordinate) => `${coordinate[0].toFixed(6)},${coordinate[1].toFixed(6)}`)
      .join("|") ?? "no-geometry",
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
    case "attention_required":
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
  zoneContainers = [],
  depot = null,
  routeGeometry,
}: AgentRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const overlayLayerRef = useRef<LayerGroup | null>(null);
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);
  const markerIconRef = useRef<Map<string, DivIcon>>(new Map());

  const normalizedStops = useMemo(() => normalizeStops(stops), [stops]);
  const normalizedDepot = useMemo(() => normalizeDepot(depot), [depot]);
  const visibleContainers = useMemo(
    () => normalizeVisibleContainers(normalizedStops, zoneContainers),
    [normalizedStops, zoneContainers],
  );
  const displayGeometry = useMemo(
    () => routeGeometry?.geometry ?? buildFallbackLineString(normalizedStops, normalizedDepot),
    [normalizedDepot, normalizedStops, routeGeometry],
  );
  const shouldUseStaticPreview = import.meta.env.MODE === "test";
  const routePath = useMemo(() => toLatLngPath(displayGeometry), [displayGeometry]);
  const fitBoundsPoints = useMemo(() => {
    const points = [
      ...routePath,
      ...visibleContainers.map((container) => [container.latitude, container.longitude] as [number, number]),
      ...(normalizedDepot
        ? [[normalizedDepot.latitude, normalizedDepot.longitude] as [number, number]]
        : []),
    ];

    return points.length > 0 ? points : [PARIS_CENTER];
  }, [normalizedDepot, routePath, visibleContainers]);
  const overlaySignature = useMemo(
    () =>
      buildOverlaySignature(
        visibleContainers,
        displayGeometry,
        routeGeometry?.source ?? "fallback",
        normalizedDepot,
      ),
    [displayGeometry, normalizedDepot, routeGeometry?.source, visibleContainers],
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

      if (normalizedDepot) {
        const depotCircle = L.circleMarker([normalizedDepot.latitude, normalizedDepot.longitude], {
          radius: 8,
          fillColor: "#8bb9ff",
          fillOpacity: 0.98,
          color: "#0b2444",
          weight: 2,
        });

        depotCircle.bindTooltip(`Depot - ${normalizedDepot.label}`, {
          direction: "top",
          offset: [0, -8],
          opacity: 0.95,
        });
        depotCircle.addTo(overlayLayer);

        const depotIconCacheKey = "ops-stop-marker ops-stop-marker-depot:D";
        let depotIcon = markerIconRef.current.get(depotIconCacheKey);
        if (!depotIcon) {
          depotIcon = L.divIcon({
            className: "ops-stop-marker ops-stop-marker-depot",
            html: "<span>D</span>",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          markerIconRef.current.set(depotIconCacheKey, depotIcon);
        }

        L.marker([normalizedDepot.latitude, normalizedDepot.longitude], {
          icon: depotIcon,
          keyboard: false,
          interactive: false,
        }).addTo(overlayLayer);
      }

      visibleContainers.forEach((container) => {
        const markerTheme = getMarkerTheme(container.status);
        const circle = L.circleMarker([container.latitude, container.longitude], {
          radius: 7,
          fillColor: markerTheme.fill,
          fillOpacity: 0.95,
          color: markerTheme.stroke,
          weight: 2,
        });

        circle.bindTooltip(
          container.isRouted && container.stopOrder != null
            ? `#${container.stopOrder} ${container.code} - ${container.label}`
            : `${container.code} - ${container.label}`,
          {
            direction: "top",
            offset: [0, -8],
            opacity: 0.95,
          },
        );
        circle.addTo(overlayLayer);

        if (container.isRouted && container.stopOrder != null) {
          const iconCacheKey = `${markerTheme.className}:${container.stopOrder}`;
          let labelIcon = markerIconRef.current.get(iconCacheKey);
          if (!labelIcon) {
            labelIcon = L.divIcon({
              className: markerTheme.className,
              html: `<span>${container.stopOrder}</span>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
            markerIconRef.current.set(iconCacheKey, labelIcon);
          }

          const labelMarker = L.marker([container.latitude, container.longitude], {
            icon: labelIcon,
            keyboard: false,
            interactive: false,
          });
          labelMarker.addTo(overlayLayer);
        }
      });

      overlayLayer.addTo(map);
      overlayLayerRef.current = overlayLayer;

      const bounds = L.latLngBounds(fitBoundsPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [28, 28],
          maxZoom: visibleContainers.length <= 1 ? 16 : 15,
        });
      }
    };

    void renderMap();

    return () => {
      isCancelled = true;
    };
  }, [fitBoundsPoints, overlaySignature, routePath, shouldUseStaticPreview, visibleContainers.length]);

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
        <span>
          {routeGeometry?.source === "live"
            ? "Stored road route"
            : routePath.length >= 2
              ? "Stored fallback route"
              : visibleContainers.length > 0
                ? "Zone container map"
                : "Paris focus view"}
        </span>
      </div>
    </div>
  );
}
