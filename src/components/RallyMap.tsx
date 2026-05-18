import React, { useEffect, useRef, useState } from "react";
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
  elevationAtDistance,
  parseGpx,
  pointAtDistance,
  routeCoordinatesUntilDistance,
  routeDistanceAtPoint,
  routeFeature,
  waypointCollection,
  type DisplayWaypoint,
  type LonLat,
  type ParsedGpx,
} from "../gpx";
import {
  easedTravelProgress,
  getSmoothedBearing,
  getSmoothingWindow,
  halfLifeAlpha,
  lerpBearing,
  lerpLonLat,
  pointFeature,
} from "../cameraPath";
import { colors, layout, mapCamera } from "../theme";
import { SEGMENTS, type Segment } from "../data/segments";
import {
  applySmoothedCameraTerrainAltitude,
  resolveSmoothedCameraTerrainAltitude,
  type SmoothedCameraTerrainAltitudeState,
} from "../mapboxRenderConfig";
import { resolveMapboxStyle } from "../rally.config";
import { MapFallback } from "./MapFallback";
import {
  SOURCE_IDS,
  addRouteAndWaypointLayers,
  loadAllPinImages,
  setPublicZoneRevealProgress,
  setGeoJsonData,
} from "./mapLayers";

type RallyMapProps = {
  segment: Segment;
  gpxPath: string;
};

type CameraState = {
  distance: number;
  center: LonLat;
  bearing: number;
  cameraTerrainAltitudeMeters: number | null;
  trackerPoint: LonLat;
};

const getRouteColor = (segment: Segment) =>
  segment.type === "ES" ? colors.orange : colors.blue;

const getPitch = (segment: Segment) =>
  segment.type === "ES" ? mapCamera.pitch.es : mapCamera.pitch.liaison;

const getZoom = (segment: Segment) =>
  segment.type === "ES" ? mapCamera.zoom.es : mapCamera.zoom.liaison;

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
): DisplayWaypoint[] => {
  // ZP comme markers : reveal = distance à laquelle le point apparaît sur
  // le tracé. La couche markers cache (icône + label) tant que la caméra
  // n'a pas franchi cette distance.
  const addRevealDistance = (waypoint: DisplayWaypoint): DisplayWaypoint => ({
    ...waypoint,
    revealDistanceMeters: routeDistanceAtPoint(route, waypoint.coordinates),
    hideDistanceMeters: route.totalDistanceMeters,
  });

  if (segment.type !== "ES") {
    return route.waypoints
      .map((waypoint) => {
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
      })
      .map(addRevealDistance);
  }

  return route.waypoints
    .map((waypoint) => {
      if (waypoint.kind === "public-zone") return waypoint;
      if (waypoint.kind === "start" || waypoint.kind === "finish") {
        return {
          ...waypoint,
          name: formatEsWaypointLabel(waypoint.name, segment.esNumber),
        };
      }
      return { ...waypoint, kind: "standard" as const };
    })
    .map(addRevealDistance);
};

const getProgress = (
  frame: number,
  durationInFrames: number,
  fps: number
) => {
  const holdFrames = Math.min(
    Math.round(mapCamera.segmentVideo.introOutroHoldSeconds * fps),
    Math.floor(Math.max(0, durationInFrames - 1) / 2)
  );
  const activeFrames = Math.max(1, durationInFrames - holdFrames * 2);
  return easedTravelProgress(
    (frame - holdFrames) / fps,
    activeFrames / fps,
    mapCamera.travelEaseSeconds
  );
};

const buildCinematicCameraPath = (
  route: ParsedGpx,
  durationInFrames: number,
  fps: number
): CameraState[] => {
  const { cinematic } = mapCamera;
  const centerLead = getSmoothingWindow(
    route.totalDistanceMeters,
    cinematic.centerLead
  );
  const bearingLead = getSmoothingWindow(
    route.totalDistanceMeters,
    cinematic.bearingLead
  );
  const bearingWindow = getSmoothingWindow(
    route.totalDistanceMeters,
    cinematic.bearingWindow
  );
  const centerAlpha = halfLifeAlpha(cinematic.centerHalfLifeSeconds, fps);
  const bearingAlpha = halfLifeAlpha(cinematic.bearingHalfLifeSeconds, fps);
  const terrainAltitudeAlpha = halfLifeAlpha(
    cinematic.terrainAltitudeHalfLifeSeconds,
    fps
  );
  const states: CameraState[] = [];
  let center = pointAtDistance(route, centerLead).point;
  let bearing = getSmoothedBearing(
    route,
    bearingLead,
    bearingWindow,
    cinematic.bearingWindow.sampleCount
  );
  let terrainAltitude = elevationAtDistance(route, centerLead);

  for (let frame = 0; frame < durationInFrames; frame++) {
    const progress = getProgress(frame, durationInFrames, fps);
    const distance = route.totalDistanceMeters * progress;
    const trackerPoint = pointAtDistance(route, distance).point;
    const targetCenterDistance = distance + centerLead;
    const targetCenter = pointAtDistance(route, targetCenterDistance).point;
    const targetBearing = getSmoothedBearing(
      route,
      distance + bearingLead,
      bearingWindow,
      cinematic.bearingWindow.sampleCount
    );
    const targetTerrainAltitude = elevationAtDistance(
      route,
      targetCenterDistance
    );

    if (frame === 0) {
      center = targetCenter;
      bearing = targetBearing;
      terrainAltitude = targetTerrainAltitude;
    } else {
      center = lerpLonLat(center, targetCenter, centerAlpha);
      bearing = lerpBearing(bearing, targetBearing, bearingAlpha);
      if (terrainAltitude === null) {
        terrainAltitude = targetTerrainAltitude;
      } else if (targetTerrainAltitude !== null) {
        terrainAltitude =
          terrainAltitude +
          (targetTerrainAltitude - terrainAltitude) * terrainAltitudeAlpha;
      }
    }

    states.push({
      distance,
      center,
      bearing,
      cameraTerrainAltitudeMeters: terrainAltitude,
      trackerPoint,
    });
  }

  return states;
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

  map.addSource(SOURCE_IDS.routeFull, {
    type: "geojson",
    data: fullRoute,
  });
  map.addSource(SOURCE_IDS.routeProgress, {
    type: "geojson",
    data: initialProgressRoute,
  });
  map.addSource(SOURCE_IDS.waypoints, {
    type: "geojson",
    data: waypointCollection(displayWaypoints),
  });
  map.addSource(SOURCE_IDS.tracker, {
    type: "geojson",
    data: pointFeature(route.coordinates[0]),
  });

  addRouteAndWaypointLayers(map, {
    lineColor: routeColor,
    trackerCoreColor: routeColor,
  });

  return displayWaypoints
    .filter((w) => w.kind !== "public-zone")
    .map((w) => w.revealDistanceMeters ?? 0)
    .sort((a, b) => a - b);
};

const updateMapFrame = (
  map: mapboxgl.Map,
  route: ParsedGpx,
  segment: Segment,
  cameraState: CameraState,
  sortedMarkerDistances: number[],
  frame: number,
  fps: number,
  terrainAltitudeState: SmoothedCameraTerrainAltitudeState
) => {
  applySmoothedCameraTerrainAltitude(
    map,
    terrainAltitudeState.altitudeMeters ?? cameraState.cameraTerrainAltitudeMeters
  );
  map.jumpTo({
    center: cameraState.center,
    zoom: getZoom(segment),
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
  const terrainAltitude = resolveSmoothedCameraTerrainAltitude({
    map,
    center: cameraState.center,
    fallbackAltitudeMeters: cameraState.cameraTerrainAltitudeMeters,
    frame,
    fps,
    halfLifeSeconds: mapCamera.cinematic.terrainAltitudeHalfLifeSeconds,
    state: terrainAltitudeState,
  });
  applySmoothedCameraTerrainAltitude(
    map,
    terrainAltitude
  );

  setGeoJsonData(
    map,
    SOURCE_IDS.routeProgress,
    routeFeature(routeCoordinatesUntilDistance(route, cameraState.distance))
  );
  setGeoJsonData(
    map,
    SOURCE_IDS.tracker,
    pointFeature(cameraState.trackerPoint)
  );
  const cutoff =
    sortedMarkerDistances.find((d) => d > cameraState.distance) ??
    Number.MAX_SAFE_INTEGER;
  setPublicZoneRevealProgress(map, cameraState.distance, cutoff);
};

export const RallyMap: React.FC<RallyMapProps> = ({ segment, gpxPath }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const routeRef = useRef<ParsedGpx | null>(null);
  const cameraPathRef = useRef<CameraState[]>([]);
  const markerDistancesRef = useRef<number[]>([]);
  const terrainAltitudeStateRef = useRef<SmoothedCameraTerrainAltitudeState>({
    frame: null,
    altitudeMeters: null,
  });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.REMOTION_MAPBOX_TOKEN;
    const style = resolveMapboxStyle();

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
        mapboxgl.maxParallelImageRequests = 32;

        const start = cameraPath[0];
        const map = new mapboxgl.Map({
          container: containerRef.current as HTMLDivElement,
          style,
          center: start.center,
          zoom: getZoom(segment),
          bearing: start.bearing,
          pitch: getPitch(segment),
          interactive: false,
          preserveDrawingBuffer: true,
          fadeDuration: 1000,
          refreshExpiredTiles: false,
          logoPosition: "bottom-right",
          attributionControl: false,
        });

        mapRef.current = map;

        map.once("load", async () => {
          try {
            if (cancelled) return;

            await loadAllPinImages(map);

            markerDistancesRef.current = addRouteLayers(map, route, segment);
            updateMapFrame(
              map,
              route,
              segment,
              start,
              markerDistancesRef.current,
              0,
              fps,
              terrainAltitudeStateRef.current
            );

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
      mapRef.current = null;
      cameraPathRef.current = [];
      terrainAltitudeStateRef.current = { frame: null, altitudeMeters: null };
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
    updateMapFrame(
      map,
      route,
      segment,
      cameraState,
      markerDistancesRef.current,
      frame,
      fps,
      terrainAltitudeStateRef.current
    );
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
