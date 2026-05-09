import React, { useEffect, useRef, useState } from "react";
import type { Feature, Point } from "geojson";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  bearingDegrees,
  distanceMeters,
  parseGpx,
  pointAtDistance,
  routeCoordinatesUntilDistance,
  routeFeature,
  waypointCollection,
  type GpxWaypoint,
  type LonLat,
  type ParsedGpx,
} from "../gpx";
import {
  colors,
  fonts,
  layout,
  mapCamera,
  mapPins,
  mapRoute,
} from "../theme";
import { SEGMENTS, type Segment } from "../data/segments";

const ROUTE_FULL_SOURCE = "route-full";
const ROUTE_PROGRESS_SOURCE = "route-progress";
const WAYPOINT_SOURCE = "waypoints";
const TRACKER_SOURCE = "tracker";

const PIN_START = "pin-start";
const PIN_FINISH = "pin-finish";
const PIN_PUBLIC_ZONE = "pin-public-zone";
const PIN_STANDARD = "pin-standard";

type RallyMapProps = {
  segment: Segment;
  gpxPath: string;
};

type CameraState = {
  distance: number;
  center: LonLat;
  bearing: number;
  trackerPoint: LonLat;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const smoothStep = (value: number) => value * value * (3 - 2 * value);

const getRouteColor = (segment: Segment) =>
  segment.type === "ES" ? colors.orange : colors.blue;

const getPitch = (segment: Segment) =>
  segment.type === "ES" ? mapCamera.pitch.es : mapCamera.pitch.liaison;

const formatEsWaypointLabel = (
  rawName: string,
  esNumber: number | undefined
): string => {
  if (esNumber === undefined) return rawName.replace(/\s+/g, " ").trim();
  const esPattern = /\bES\s*\d+(?:\s*-\s*\d+)?\b/i;
  const replaced = esPattern.test(rawName)
    ? rawName.replace(esPattern, `ES ${esNumber}`)
    : rawName.replace(
        /^(\s*(?:D[ée]part|Arriv[ée]e))(\s+|$)/i,
        `$1 ES ${esNumber} `
      );
  return replaced
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(\bES\s*\d+)\s+/i, "$1\n");
};

const findAdjacentEsNumber = (
  segment: Segment,
  direction: "previous" | "next"
): number | undefined => {
  const idx = SEGMENTS.findIndex((s) => s.id === segment.id);
  if (idx < 0) return undefined;
  const step = direction === "next" ? 1 : -1;
  for (let i = idx + step; i >= 0 && i < SEGMENTS.length; i += step) {
    const candidate = SEGMENTS[i];
    if (candidate.stage !== segment.stage) break;
    if (candidate.type === "ES") return candidate.esNumber;
  }
  return undefined;
};

const getDisplayWaypoints = (
  segment: Segment,
  route: ParsedGpx
): GpxWaypoint[] => {
  if (segment.type !== "ES") {
    return route.waypoints.map((waypoint) => {
      if (waypoint.kind === "public-zone") return waypoint;
      if (waypoint.kind === "start") {
        const esNumber = findAdjacentEsNumber(segment, "next");
        return {
          ...waypoint,
          name:
            esNumber !== undefined
              ? formatEsWaypointLabel(waypoint.name, esNumber)
              : waypoint.name,
        };
      }
      if (waypoint.kind === "finish") {
        const esNumber = findAdjacentEsNumber(segment, "previous");
        return {
          ...waypoint,
          name:
            esNumber !== undefined
              ? formatEsWaypointLabel(waypoint.name, esNumber)
              : waypoint.name,
        };
      }
      return { ...waypoint, kind: "standard" as const };
    });
  }

  return route.waypoints.map((waypoint) => {
    if (waypoint.kind === "public-zone") return waypoint;
    if (waypoint.kind === "start" || waypoint.kind === "finish") {
      return {
        ...waypoint,
        name: formatEsWaypointLabel(waypoint.name, segment.esNumber),
      };
    }
    return { ...waypoint, kind: "standard" as const };
  });
};

const getProgress = (
  frame: number,
  durationInFrames: number,
  fps: number
) => {
  const holdFrames = Math.min(
    Math.round(mapCamera.progress.holdSeconds * fps),
    Math.floor(Math.max(0, durationInFrames - 1) / 2)
  );
  const activeFrames = Math.max(1, durationInFrames - holdFrames * 2);
  const rawProgress = clamp((frame - holdFrames) / activeFrames, 0, 1);
  return smoothStep(rawProgress);
};

const pointFeature = (coordinates: LonLat): Feature<Point> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Point",
    coordinates,
  },
});

const lerpLonLat = (from: LonLat, to: LonLat, alpha: number): LonLat => [
  from[0] + (to[0] - from[0]) * alpha,
  from[1] + (to[1] - from[1]) * alpha,
];

const shortestAngleDelta = (from: number, to: number) =>
  ((((to - from) % 360) + 540) % 360) - 180;

const lerpBearing = (from: number, to: number, alpha: number) =>
  (from + shortestAngleDelta(from, to) * alpha + 360) % 360;

const halfLifeAlpha = (halfLifeSeconds: number, fps: number) => {
  if (halfLifeSeconds <= 0) return 1;
  return 1 - 2 ** (-1 / (halfLifeSeconds * fps));
};

const getSmoothingWindow = (
  route: ParsedGpx,
  config: {
    minMeters: number;
    maxMeters: number;
    routeDistanceRatio: number;
  }
) =>
  clamp(
    route.totalDistanceMeters * config.routeDistanceRatio,
    config.minMeters,
    config.maxMeters
  );

const getOddSampleCount = (sampleCount: number) =>
  Math.max(3, Math.ceil(sampleCount) | 1);

const getSmoothedBearing = (
  route: ParsedGpx,
  distance: number,
  windowMeters: number,
  sampleCount: number
) => {
  const samples = getOddSampleCount(sampleCount);
  let x = 0;
  let y = 0;
  let weightTotal = 0;

  for (let index = 0; index < samples; index++) {
    const progress = samples === 1 ? 0 : index / (samples - 1);
    const centerDistance = distance - windowMeters + progress * windowMeters * 2;
    const startDistance = centerDistance - windowMeters * 0.5;
    const endDistance = centerDistance + windowMeters * 0.5;
    const start = pointAtDistance(route, startDistance).point;
    const end = pointAtDistance(route, endDistance).point;
    if (distanceMeters(start, end) < 1) continue;

    const bearing = (bearingDegrees(start, end) * Math.PI) / 180;
    const weight = 1 - Math.abs(progress - 0.5) * 1.5;

    x += Math.cos(bearing) * weight;
    y += Math.sin(bearing) * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) {
    return pointAtDistance(route, distance).bearing;
  }

  return ((Math.atan2(y / weightTotal, x / weightTotal) * 180) / Math.PI + 360) % 360;
};

const buildCinematicCameraPath = (
  route: ParsedGpx,
  durationInFrames: number,
  fps: number
): CameraState[] => {
  const { cinematic } = mapCamera;
  const centerLead = getSmoothingWindow(route, cinematic.centerLead);
  const bearingLead = getSmoothingWindow(route, cinematic.bearingLead);
  const bearingWindow = getSmoothingWindow(route, cinematic.bearingWindow);
  const centerAlpha = halfLifeAlpha(cinematic.centerHalfLifeSeconds, fps);
  const bearingAlpha = halfLifeAlpha(cinematic.bearingHalfLifeSeconds, fps);
  const states: CameraState[] = [];
  let center = pointAtDistance(route, centerLead).point;
  let bearing = getSmoothedBearing(
    route,
    bearingLead,
    bearingWindow,
    cinematic.bearingWindow.sampleCount
  );

  for (let frame = 0; frame < durationInFrames; frame++) {
    const progress = getProgress(frame, durationInFrames, fps);
    const distance = route.totalDistanceMeters * progress;
    const trackerPoint = pointAtDistance(route, distance).point;
    const targetCenter = pointAtDistance(route, distance + centerLead).point;
    const targetBearing = getSmoothedBearing(
      route,
      distance + bearingLead,
      bearingWindow,
      cinematic.bearingWindow.sampleCount
    );

    if (frame === 0) {
      center = targetCenter;
      bearing = targetBearing;
    } else {
      center = lerpLonLat(center, targetCenter, centerAlpha);
      bearing = lerpBearing(bearing, targetBearing, bearingAlpha);
    }

    states.push({
      distance,
      center,
      bearing,
      trackerPoint,
    });
  }

  return states;
};

const loadMapImage = (
  map: mapboxgl.Map,
  imageId: string,
  imagePath: string,
  pixelRatio: number
) =>
  new Promise<void>((resolve, reject) => {
    if (map.hasImage(imageId)) {
      resolve();
      return;
    }

    map.loadImage(staticFile(imagePath), (error, image) => {
      if (error) {
        reject(error);
        return;
      }

      if (!image) {
        reject(new Error(`Image Mapbox introuvable : ${imagePath}`));
        return;
      }

      map.addImage(imageId, image, { pixelRatio });
      resolve();
    });
  });

const setGeoJsonData = (
  map: mapboxgl.Map,
  sourceId: string,
  data: GeoJSON.GeoJSON
) => {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  source?.setData(data);
};

const addRouteLayers = (
  map: mapboxgl.Map,
  route: ParsedGpx,
  segment: Segment
) => {
  const routeColor = getRouteColor(segment);
  const displayWaypoints = getDisplayWaypoints(segment, route);
  const fullRoute = routeFeature(route.coordinates);
  const initialProgressRoute = routeFeature(
    routeCoordinatesUntilDistance(route, 0)
  );

  map.addSource(ROUTE_FULL_SOURCE, {
    type: "geojson",
    data: fullRoute,
  });
  map.addSource(ROUTE_PROGRESS_SOURCE, {
    type: "geojson",
    data: initialProgressRoute,
  });
  map.addSource(WAYPOINT_SOURCE, {
    type: "geojson",
    data: waypointCollection(displayWaypoints),
  });
  map.addSource(TRACKER_SOURCE, {
    type: "geojson",
    data: pointFeature(route.coordinates[0]),
  });

  const { lineWidthStops } = mapRoute;
  const widthExpressionWithOffset = (offset: number) => [
    "interpolate",
    ["linear"],
    ["zoom"],
    lineWidthStops.lowZoom,
    lineWidthStops.lowWidth + offset,
    lineWidthStops.midZoom,
    lineWidthStops.midWidth + offset,
    lineWidthStops.highZoom,
    lineWidthStops.highWidth + offset,
  ];
  const widthExpression = widthExpressionWithOffset(0);

  map.addLayer({
    id: "route-full-outline",
    type: "line",
    source: ROUTE_FULL_SOURCE,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": mapRoute.outlineColor,
      "line-opacity": mapRoute.fullOutlineOpacity,
      "line-width": widthExpressionWithOffset(mapRoute.fullOutlineExtraWidth),
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "route-full",
    type: "line",
    source: ROUTE_FULL_SOURCE,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": routeColor,
      "line-opacity": mapRoute.fullRouteOpacity,
      "line-width": widthExpression,
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "route-progress-outline",
    type: "line",
    source: ROUTE_PROGRESS_SOURCE,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": mapRoute.outlineColor,
      "line-opacity": mapRoute.progressOutlineOpacity,
      "line-width": widthExpressionWithOffset(mapRoute.progressOutlineExtraWidth),
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "route-progress",
    type: "line",
    source: ROUTE_PROGRESS_SOURCE,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": routeColor,
      "line-opacity": 1,
      "line-width": widthExpression,
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "tracker-halo",
    type: "circle",
    source: TRACKER_SOURCE,
    paint: {
      "circle-color": mapRoute.tracker.haloColor,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        mapRoute.tracker.radiusStops.lowZoom,
        mapRoute.tracker.radiusStops.haloLowRadius,
        mapRoute.tracker.radiusStops.highZoom,
        mapRoute.tracker.radiusStops.haloHighRadius,
      ],
      "circle-stroke-color": mapRoute.tracker.haloStrokeColor,
      "circle-stroke-width": mapRoute.tracker.haloStrokeWidth,
    },
  } as mapboxgl.CircleLayerSpecification);

  map.addLayer({
    id: "tracker-core",
    type: "circle",
    source: TRACKER_SOURCE,
    paint: {
      "circle-color": routeColor,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        mapRoute.tracker.radiusStops.lowZoom,
        mapRoute.tracker.radiusStops.coreLowRadius,
        mapRoute.tracker.radiusStops.highZoom,
        mapRoute.tracker.radiusStops.coreHighRadius,
      ],
      "circle-stroke-color": mapRoute.tracker.coreStrokeColor,
      "circle-stroke-width": mapRoute.tracker.coreStrokeWidth,
    },
  } as mapboxgl.CircleLayerSpecification);

  map.addLayer({
    id: "waypoints",
    type: "symbol",
    source: WAYPOINT_SOURCE,
    layout: {
      "icon-image": [
        "match",
        ["get", "kind"],
        "start",
        PIN_START,
        "finish",
        PIN_FINISH,
        "public-zone",
        PIN_PUBLIC_ZONE,
        "standard",
        PIN_STANDARD,
        PIN_STANDARD,
      ],
      "icon-size": [
        "match",
        ["get", "kind"],
        "public-zone",
        mapPins.iconSize.publicZone,
        "standard",
        mapPins.iconSize.standard,
        mapPins.iconSize.startFinish,
      ],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "text-field": ["get", "label"],
      "text-font": mapPins.label.font,
      "text-letter-spacing": mapPins.label.letterSpacing,
      "text-max-width": mapPins.label.maxWidth,
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        mapPins.label.lowZoom,
        mapPins.label.lowSize,
        mapPins.label.highZoom,
        mapPins.label.highSize,
      ],
      "text-offset": [mapPins.label.textOffset.x, mapPins.label.textOffset.y],
      "text-anchor": "top",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": mapPins.label.color,
      "text-halo-color": mapPins.label.haloColor,
      "text-halo-width": mapPins.label.haloWidth,
      "text-halo-blur": mapPins.label.haloBlur,
    },
  } as mapboxgl.SymbolLayerSpecification);
};

const updateMapFrame = (
  map: mapboxgl.Map,
  route: ParsedGpx,
  segment: Segment,
  cameraState: CameraState
) => {
  map.jumpTo({
    center: cameraState.center,
    zoom: mapCamera.zoom,
    bearing: cameraState.bearing,
    pitch: getPitch(segment),
    padding: {
      top: mapCamera.padding.top,
      bottom: mapCamera.padding.bottom,
      left: layout.panelWidth + mapCamera.padding.leftPanelGap,
      right: mapCamera.padding.right,
    },
    retainPadding: false,
  });

  setGeoJsonData(
    map,
    ROUTE_PROGRESS_SOURCE,
    routeFeature(routeCoordinatesUntilDistance(route, cameraState.distance))
  );
  setGeoJsonData(map, TRACKER_SOURCE, pointFeature(cameraState.trackerPoint));
};

const MapFallback: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(135deg, #07111f 0%, #0f335a 56%, #2e4660 100%)",
      color: colors.white,
      fontFamily: fonts.display,
      fontSize: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: 80,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const RallyMap: React.FC<RallyMapProps> = ({ segment, gpxPath }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const routeRef = useRef<ParsedGpx | null>(null);
  const cameraPathRef = useRef<CameraState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.REMOTION_MAPBOX_TOKEN;
    const style =
      process.env.REMOTION_MAPBOX_STYLE ?? mapCamera.defaultStyle;

    if (!token) {
      setError("Token Mapbox manquant : renseigne REMOTION_MAPBOX_TOKEN.");
      return;
    }

    if (!containerRef.current) return;

    let cancelled = false;
    let completed = false;
    const handle = delayRender(`Chargement carte ${segment.id}`, {
      timeoutInMilliseconds: mapCamera.renderTimeouts.loadMapMs,
    });

    const complete = () => {
      if (completed) return;
      completed = true;
      continueRender(handle);
    };

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      complete();
    };

    const setup = async () => {
      try {
        const response = await fetch(staticFile(gpxPath));
        if (!response.ok) {
          throw new Error(`GPX introuvable : ${gpxPath}`);
        }

        const route = parseGpx(await response.text());
        routeRef.current = route;
        const cameraPath = buildCinematicCameraPath(
          route,
          durationInFrames,
          fps
        );
        cameraPathRef.current = cameraPath;
        mapboxgl.accessToken = token;

        const start = cameraPath[0];
        const map = new mapboxgl.Map({
          container: containerRef.current as HTMLDivElement,
          style,
          center: start.center,
          zoom: mapCamera.zoom,
          bearing: start.bearing,
          pitch: getPitch(segment),
          interactive: false,
          preserveDrawingBuffer: true,
        });

        mapRef.current = map;

        map.once("load", async () => {
          try {
            if (cancelled) return;

            await Promise.all([
              loadMapImage(map, PIN_START, mapPins.startPath, 2),
              loadMapImage(map, PIN_FINISH, mapPins.finishPath, 2),
              loadMapImage(map, PIN_STANDARD, mapPins.standardPath, 2),
              loadMapImage(map, PIN_PUBLIC_ZONE, mapPins.publicZonePath, 2),
            ]);

            addRouteLayers(map, route, segment);
            updateMapFrame(map, route, segment, start);

            map.once("idle", () => {
              if (cancelled) return;
              setIsReady(true);
              complete();
            });
            map.triggerRepaint();
          } catch (err) {
            fail(err instanceof Error ? err.message : String(err));
          }
        });

        map.on("error", (event) => {
          console.warn("Mapbox error", event.error);
        });
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
    };

    setup();

    return () => {
      cancelled = true;
      complete();
      mapRef.current?.remove();
      mapRef.current = null;
      cameraPathRef.current = [];
    };
  }, [durationInFrames, fps, gpxPath, segment]);

  useEffect(() => {
    const map = mapRef.current;
    const route = routeRef.current;
    if (!isReady || !map || !route) return;
    const cameraPath = cameraPathRef.current;
    const cameraState =
      cameraPath[Math.min(frame, cameraPath.length - 1)] ?? cameraPath[0];
    if (!cameraState) return;

    let done = false;
    const handle = delayRender(`Frame carte ${segment.id}:${frame}`, {
      timeoutInMilliseconds: mapCamera.renderTimeouts.frameMs,
    });
    const complete = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };

    map.once("render", complete);
    updateMapFrame(map, route, segment, cameraState);
    map.triggerRepaint();

    const timeout = window.setTimeout(
      complete,
      mapCamera.renderTimeouts.frameFallbackMs
    );

    return () => {
      window.clearTimeout(timeout);
      map.off("render", complete);
      complete();
    };
  }, [frame, isReady, segment]);

  if (error) {
    return <MapFallback>{error}</MapFallback>;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#07111f" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(5, 14, 28, 0.44) 0%, rgba(5, 14, 28, 0.22) 27%, rgba(5, 14, 28, 0) 62%)",
        }}
      />
    </AbsoluteFill>
  );
};
