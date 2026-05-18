import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString } from "geojson";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  distanceMeters,
  elevationAtDistance,
  pointAtDistance,
  routeDistanceAtPoint,
  waypointCollection,
  type DisplayWaypoint,
  type GpxWaypoint,
  type LonLat,
  type ParsedGpx,
  type WaypointKind,
} from "../gpx";
import {
  getSmoothedBearing,
  getSmoothingWindow,
  halfLifeAlpha,
  lerpBearing,
  lerpLonLat,
  pointFeature,
} from "../cameraPath";
import { colors, layout, mapCamera, mapRoute } from "../theme";
import { SEGMENTS, type Segment } from "../data/segments";
import {
  applySmoothedCameraTerrainAltitude,
  resolveSmoothedCameraTerrainAltitude,
  type SmoothedCameraTerrainAltitudeState,
} from "../mapboxRenderConfig";
import { resolveMapboxStyle } from "../rally.config";
import {
  findActiveSegmentIndex,
  findActiveSegmentSpan,
  spanCoordinatesUntilDistance,
  type StagedRoute,
  type StagedSegmentSpan,
} from "../stagedRoute";
import {
  getDistanceAtTime,
  type StageTimeline,
} from "../stageTimeline";
import { MapFallback } from "./MapFallback";
import {
  SOURCE_IDS,
  addRouteAndWaypointLayers,
  loadAllPinImages,
  setPublicZoneRevealProgress,
  setGeoJsonData,
  setTrackerCoreColor,
} from "./mapLayers";

type ContinuousStageMapProps = {
  route: StagedRoute;
  timeline: StageTimeline;
};

type CameraState = {
  distance: number;
  center: LonLat;
  bearing: number;
  cameraTerrainAltitudeMeters: number | null;
  pitch: number;
  zoom: number;
  trackerPoint: LonLat;
};

const pitchForSegment = (segment: Segment) =>
  segment.type === "ES" ? mapCamera.pitch.es : mapCamera.pitch.liaison;

const zoomForSegment = (segment: Segment) =>
  segment.type === "ES" ? mapCamera.zoom.es : mapCamera.zoom.liaison;

const buildContinuousCameraPath = (
  route: StagedRoute,
  timeline: StageTimeline,
  durationInFrames: number,
  fps: number
): CameraState[] => {
  const { cinematic } = mapCamera;
  const totalDistance = route.totalDistanceMeters;
  const centerLead = getSmoothingWindow(totalDistance, cinematic.centerLead);
  const bearingLead = getSmoothingWindow(totalDistance, cinematic.bearingLead);
  const bearingWindow = getSmoothingWindow(
    totalDistance,
    cinematic.bearingWindow
  );
  const centerAlpha = halfLifeAlpha(cinematic.centerHalfLifeSeconds, fps);
  const bearingAlpha = halfLifeAlpha(cinematic.bearingHalfLifeSeconds, fps);
  const terrainAltitudeAlpha = halfLifeAlpha(
    cinematic.terrainAltitudeHalfLifeSeconds,
    fps
  );
  const pitchAlpha = halfLifeAlpha(cinematic.pitchHalfLifeSeconds, fps);
  const zoomAlpha = halfLifeAlpha(cinematic.zoomHalfLifeSeconds, fps);

  const routeAsParsed: ParsedGpx = {
    name: "stage",
    coordinates: route.coordinates,
    cumulativeDistances: route.cumulativeDistances,
    totalDistanceMeters: route.totalDistanceMeters,
    elevations: route.elevations,
    waypoints: [],
  };

  const states: CameraState[] = [];
  let center = pointAtDistance(routeAsParsed, centerLead).point;
  let bearing = getSmoothedBearing(
    routeAsParsed,
    bearingLead,
    bearingWindow,
    cinematic.bearingWindow.sampleCount
  );
  const initialSegment = findActiveSegmentSpan(route, 0).segment;
  let pitch = pitchForSegment(initialSegment);
  let zoom = zoomForSegment(initialSegment);
  let terrainAltitude = elevationAtDistance(routeAsParsed, centerLead);

  for (let frame = 0; frame < durationInFrames; frame++) {
    const time = frame / fps;
    const distance = getDistanceAtTime(timeline, time);
    const trackerPoint = pointAtDistance(routeAsParsed, distance).point;
    const targetCenterDistance = distance + centerLead;
    const targetCenter = pointAtDistance(
      routeAsParsed,
      targetCenterDistance
    ).point;
    const targetBearing = getSmoothedBearing(
      routeAsParsed,
      distance + bearingLead,
      bearingWindow,
      cinematic.bearingWindow.sampleCount
    );
    const activeSegment = findActiveSegmentSpan(route, distance).segment;
    const targetPitch = pitchForSegment(activeSegment);
    const targetZoom = zoomForSegment(activeSegment);
    const targetTerrainAltitude = elevationAtDistance(
      routeAsParsed,
      targetCenterDistance
    );

    if (frame === 0) {
      center = targetCenter;
      bearing = targetBearing;
      pitch = targetPitch;
      zoom = targetZoom;
      terrainAltitude = targetTerrainAltitude;
    } else {
      center = lerpLonLat(center, targetCenter, centerAlpha);
      bearing = lerpBearing(bearing, targetBearing, bearingAlpha);
      pitch = pitch + (targetPitch - pitch) * pitchAlpha;
      zoom = zoom + (targetZoom - zoom) * zoomAlpha;
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
      pitch,
      zoom,
      trackerPoint,
    });
  }

  return states;
};

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

const decorateWaypointForSegment = (
  waypoint: GpxWaypoint,
  segment: Segment
): GpxWaypoint => {
  if (waypoint.kind === "public-zone") return waypoint;
  if (segment.type === "ES") {
    if (waypoint.kind === "start" || waypoint.kind === "finish") {
      return {
        ...waypoint,
        name: formatEsWaypointLabel(waypoint.name, segment.esNumber),
      };
    }
    return { ...waypoint, kind: "standard" as const };
  }
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
};

const KIND_PRIORITY: Record<WaypointKind, number> = {
  start: 4,
  finish: 4,
  "public-zone": 2,
  standard: 1,
};

type WaypointVariant = {
  decorated: DisplayWaypoint;
  segmentIndex: number;
};

type WaypointCluster = {
  variants: WaypointVariant[];
};

const buildWaypointClusters = (route: StagedRoute): WaypointCluster[] => {
  const clusters: WaypointCluster[] = [];
  for (let i = 0; i < route.segmentRoutes.length; i++) {
    const { segment, route: parsed } = route.segmentRoutes[i];
    for (const wp of parsed.waypoints) {
      const decorated = {
        ...decorateWaypointForSegment(wp, segment),
        revealDistanceMeters:
          route.segments[i].startDistance +
          routeDistanceAtPoint(parsed, wp.coordinates),
        hideDistanceMeters: route.segments[i].endDistance,
      };
      const variant: WaypointVariant = { decorated, segmentIndex: i };
      const existing = clusters.find((c) =>
        c.variants.some(
          (v) =>
            distanceMeters(v.decorated.coordinates, decorated.coordinates) <=
            mapRoute.thresholds.clusterRadiusMeters
        )
      );
      if (existing) {
        existing.variants.push(variant);
      } else {
        clusters.push({ variants: [variant] });
      }
    }
  }
  return clusters;
};

// Score plus haut = meilleur candidat. Préfère, dans l'ordre : variante du
// segment actif, segment à venir vs déjà passé, segment le plus proche en
// index, type le plus signifiant (start/finish > ZP > standard).
const scoreVariant = (variant: WaypointVariant, activeSegmentIndex: number) => {
  const isActive = variant.segmentIndex === activeSegmentIndex ? 1 : 0;
  const isUpcoming = variant.segmentIndex >= activeSegmentIndex ? 1 : 0;
  const proximity = -Math.abs(variant.segmentIndex - activeSegmentIndex);
  return [
    isActive,
    isUpcoming,
    proximity,
    KIND_PRIORITY[variant.decorated.kind],
  ];
};

const compareScores = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};

const pickVariantForActiveSegment = (
  cluster: WaypointCluster,
  activeSegmentIndex: number
): DisplayWaypoint =>
  cluster.variants.reduce((best, candidate) =>
    compareScores(
      scoreVariant(candidate, activeSegmentIndex),
      scoreVariant(best, activeSegmentIndex)
    ) > 0
      ? candidate
      : best
  ).decorated;

const buildActiveDisplayWaypoints = (
  clusters: WaypointCluster[],
  activeSegmentIndex: number
): DisplayWaypoint[] =>
  clusters.map((c) => pickVariantForActiveSegment(c, activeSegmentIndex));

const buildSegmentLineFeature = (
  span: StagedSegmentSpan,
  coordinates: LonLat[]
): Feature<LineString> => ({
  type: "Feature",
  properties: {
    segmentType: span.segment.type,
    segmentId: span.segment.id,
  },
  geometry: { type: "LineString", coordinates },
});

const buildFullRouteFeatures = (
  route: StagedRoute,
  activeSegmentIndex: number
): FeatureCollection<LineString> => ({
  type: "FeatureCollection",
  features: route.segments
    .map((span, index) => ({ span, index }))
    .filter(
      ({ span, index }) =>
        span.coordinates.length >= 2 &&
        index >= activeSegmentIndex - mapRoute.thresholds.visiblePastSegments
    )
    .map(({ span }) => buildSegmentLineFeature(span, span.coordinates)),
});

const buildProgressFeatures = (
  route: StagedRoute,
  distance: number,
  activeSegmentIndex: number
): FeatureCollection<LineString> => ({
  type: "FeatureCollection",
  features: route.segments
    .map((span, index) => {
      if (index < activeSegmentIndex - mapRoute.thresholds.visiblePastSegments) return null;
      const coords = spanCoordinatesUntilDistance(span, distance);
      if (coords.length < 2) return null;
      return buildSegmentLineFeature(span, coords);
    })
    .filter((feature): feature is Feature<LineString> => feature !== null),
});

const SEGMENT_COLOR_EXPRESSION: mapboxgl.ExpressionSpecification = [
  "match",
  ["get", "segmentType"],
  "ES",
  colors.orange,
  "LIAISON",
  colors.blue,
  colors.blue,
];

const getSegmentColor = (segment: Segment) =>
  segment.type === "ES" ? colors.orange : colors.blue;

const addRouteLayers = (
  map: mapboxgl.Map,
  route: StagedRoute,
  clusters: WaypointCluster[]
) => {
  const initialWaypoints = buildActiveDisplayWaypoints(clusters, 0);

  map.addSource(SOURCE_IDS.routeFull, {
    type: "geojson",
    data: buildFullRouteFeatures(route, 0),
  });
  map.addSource(SOURCE_IDS.routeProgress, {
    type: "geojson",
    data: buildProgressFeatures(route, 0, 0),
  });
  map.addSource(SOURCE_IDS.waypoints, {
    type: "geojson",
    data: waypointCollection(initialWaypoints),
  });
  map.addSource(SOURCE_IDS.tracker, {
    type: "geojson",
    data: pointFeature(route.coordinates[0]),
  });

  addRouteAndWaypointLayers(map, {
    lineColor: SEGMENT_COLOR_EXPRESSION,
    trackerCoreColor: getSegmentColor(route.segments[0].segment),
  });
};

const sortedMarkerDistances = (waypoints: DisplayWaypoint[]): number[] =>
  waypoints
    .filter((w) => w.kind !== "public-zone")
    .map((w) => w.revealDistanceMeters ?? 0)
    .sort((a, b) => a - b);

const upcomingCutoff = (sortedDistances: number[], distance: number): number =>
  sortedDistances.find((d) => d > distance) ?? Number.MAX_SAFE_INTEGER;

const updateMapFrame = (
  map: mapboxgl.Map,
  route: StagedRoute,
  cameraState: CameraState,
  clusters: WaypointCluster[],
  lastActiveSegmentIndexRef: { current: number },
  markerDistancesRef: { current: number[] },
  frame: number,
  fps: number,
  terrainAltitudeState: SmoothedCameraTerrainAltitudeState
) => {
  const activeSegmentIndex = findActiveSegmentIndex(route, cameraState.distance);
  const activeSpan = route.segments[activeSegmentIndex];

  applySmoothedCameraTerrainAltitude(
    map,
    terrainAltitudeState.altitudeMeters ?? cameraState.cameraTerrainAltitudeMeters
  );
  map.jumpTo({
    center: cameraState.center,
    zoom: cameraState.zoom,
    bearing: cameraState.bearing,
    pitch: cameraState.pitch,
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
    buildProgressFeatures(route, cameraState.distance, activeSegmentIndex)
  );
  setGeoJsonData(
    map,
    SOURCE_IDS.tracker,
    pointFeature(cameraState.trackerPoint)
  );
  setTrackerCoreColor(map, getSegmentColor(activeSpan.segment));

  if (lastActiveSegmentIndexRef.current !== activeSegmentIndex) {
    lastActiveSegmentIndexRef.current = activeSegmentIndex;
    const displayed = buildActiveDisplayWaypoints(clusters, activeSegmentIndex);
    markerDistancesRef.current = sortedMarkerDistances(displayed);
    setGeoJsonData(
      map,
      SOURCE_IDS.routeFull,
      buildFullRouteFeatures(route, activeSegmentIndex)
    );
    setGeoJsonData(
      map,
      SOURCE_IDS.waypoints,
      waypointCollection(displayed)
    );
  }

  setPublicZoneRevealProgress(
    map,
    cameraState.distance,
    upcomingCutoff(markerDistancesRef.current, cameraState.distance)
  );
};

export const ContinuousStageMap: React.FC<ContinuousStageMapProps> = ({
  route,
  timeline,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const cameraPathRef = useRef<CameraState[]>([]);
  const lastActiveSegmentIndexRef = useRef<number>(-1);
  const markerDistancesRef = useRef<number[]>([]);
  const terrainAltitudeStateRef = useRef<SmoothedCameraTerrainAltitudeState>({
    frame: null,
    altitudeMeters: null,
  });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waypointClusters = useMemo(() => buildWaypointClusters(route), [route]);

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
    const handle = delayRender(`Chargement carte étape`, {
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
        const cameraPath = buildContinuousCameraPath(
          route,
          timeline,
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
          zoom: start.zoom,
          bearing: start.bearing,
          pitch: start.pitch,
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

            lastActiveSegmentIndexRef.current = -1;
            markerDistancesRef.current = [];
            addRouteLayers(map, route, waypointClusters);
            updateMapFrame(
              map,
              route,
              start,
              waypointClusters,
              lastActiveSegmentIndexRef,
              markerDistancesRef,
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
  }, [durationInFrames, fps, route, timeline, waypointClusters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map) return;
    const cameraPath = cameraPathRef.current;
    const cameraState =
      cameraPath[Math.min(frame, cameraPath.length - 1)] ?? cameraPath[0];
    if (!cameraState) return;

    let done = false;
    const handle = delayRender(`Frame étape:${frame}`, {
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
      cameraState,
      waypointClusters,
      lastActiveSegmentIndexRef,
      markerDistancesRef,
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
  }, [frame, isReady, route, waypointClusters]);

  if (error) {
    return <MapFallback>{error}</MapFallback>;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#07111f" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
