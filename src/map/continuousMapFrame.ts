import type mapboxgl from "mapbox-gl";
import {
  waypointCollection,
  type DisplayWaypoint,
} from "../route/gpx";
import { pointFeature } from "./cameraPath";
import { mapCamera } from "../theme";
import {
  applySmoothedCameraTerrainAltitude,
  resolveSmoothedCameraTerrainAltitude,
  type SmoothedCameraTerrainAltitudeState,
} from "./mapboxRenderConfig";
import { findActiveSegmentIndex, type StagedRoute } from "../route/stagedRoute";
import {
  SOURCE_IDS,
  addRouteAndWaypointLayers,
  setGeoJsonData,
  setPublicZoneRevealProgress,
  setTrackerCoreColor,
} from "./mapLayers";
import type { CameraState } from "./continuousCameraPath";
import {
  buildActiveDisplayWaypoints,
  type WaypointCluster,
} from "./continuousWaypoints";
import {
  SEGMENT_COLOR_EXPRESSION,
  buildFullRouteFeatures,
  buildProgressFeatures,
  getSegmentColor,
} from "./continuousRouteFeatures";

export const addRouteLayers = (
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

export const sortedMarkerDistances = (waypoints: DisplayWaypoint[]): number[] =>
  waypoints
    .filter((w) => w.kind !== "public-zone")
    .map((w) => w.revealDistanceMeters ?? 0)
    .sort((a, b) => a - b);

const upcomingCutoff = (sortedDistances: number[], distance: number): number =>
  sortedDistances.find((d) => d > distance) ?? Number.MAX_SAFE_INTEGER;

export const updateMapFrame = (
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
      left: cameraState.leftPadding,
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
  applySmoothedCameraTerrainAltitude(map, terrainAltitude);

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
