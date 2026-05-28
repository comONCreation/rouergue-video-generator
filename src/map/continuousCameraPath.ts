import {
  elevationAtDistance,
  isRecoWaypointName,
  pointAtDistance,
  type LonLat,
  type ParsedGpx,
} from "../route/gpx";
import {
  clamp,
  easeInOutCubic,
  getSmoothedBearing,
  getSmoothingWindow,
  halfLifeAlpha,
  lerpBearing,
  lerpLonLat,
} from "./cameraPath";
import { layout, mapCamera, stageIntro } from "../theme";
import type { Segment } from "../data/segments";
import { findActiveSegmentSpan, type StagedRoute } from "../route/stagedRoute";
import {
  getDistanceAtTime,
  getStageIntroHoldSeconds,
  type StageTimeline,
} from "../route/stageTimeline";

export type CameraState = {
  distance: number;
  center: LonLat;
  bearing: number;
  cameraTerrainAltitudeMeters: number | null;
  pitch: number;
  zoom: number;
  trackerPoint: LonLat;
  leftPadding: number;
};

const pitchForSegment = (segment: Segment) =>
  segment.type === "ES" ? mapCamera.pitch.es : mapCamera.pitch.liaison;

const zoomForSegment = (segment: Segment) =>
  segment.type === "ES" ? mapCamera.zoom.es : mapCamera.zoom.liaison;

// Repère la plage de distance "reco" (entre le départ et l'arrivée reco) pour
// y appliquer un zoom dédié pendant le rendu. `null` si aucun point reco.
const findRecoDistanceSpan = (
  timeline: StageTimeline
): { startDistance: number; endDistance: number } | null => {
  const start = timeline.keyPoints.find(
    (kp) => kp.type === "es-start" && isRecoWaypointName(kp.rawWaypoint?.name)
  );
  if (!start) return null;
  const end = timeline.keyPoints.find(
    (kp) =>
      kp.type === "es-finish" &&
      isRecoWaypointName(kp.rawWaypoint?.name) &&
      kp.distance >= start.distance
  );
  if (!end) return null;
  return { startDistance: start.distance, endDistance: end.distance };
};

// Vue "ParsedGpx" sur la route complète, pour réutiliser les helpers
// (pointAtDistance, elevationAtDistance, getSmoothedBearing) sans dupliquer
// la logique d'interpolation par index cumulé.
export const asParsedRoute = (route: StagedRoute): ParsedGpx => ({
  name: "stage",
  coordinates: route.coordinates,
  cumulativeDistances: route.cumulativeDistances,
  totalDistanceMeters: route.totalDistanceMeters,
  elevations: route.elevations,
  waypoints: [],
});

export const buildContinuousCameraPath = (
  route: StagedRoute,
  timeline: StageTimeline,
  durationInFrames: number,
  fps: number
): CameraState[] => {
  const { cinematic } = mapCamera;
  const introCamera = mapCamera.stageVideo.introCamera;
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
  const stageStartFrames = Math.round(getStageIntroHoldSeconds(timeline) * fps);
  const introCardFrames = Math.min(
    stageStartFrames,
    Math.round(stageIntro.card.durationSeconds * fps)
  );
  const flyInFrames = Math.max(
    1,
    Math.min(
      stageStartFrames - introCardFrames,
      Math.round(stageIntro.flyInSeconds * fps)
    )
  );
  const introStartCenter = route.coordinates[0];
  const neutralLeftPadding = mapCamera.padding.right;
  const fullLeftPadding = layout.panelWidth + mapCamera.padding.leftPanelGap;

  const routeAsParsed = asParsedRoute(route);
  const recoSpan = findRecoDistanceSpan(timeline);

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
    const inRecoSpan =
      recoSpan !== null &&
      distance >= recoSpan.startDistance &&
      distance <= recoSpan.endDistance;
    const useCloseZoom = inRecoSpan || activeSegment.closeZoom === true;
    const targetZoom = useCloseZoom
      ? mapCamera.zoom.close
      : zoomForSegment(activeSegment);
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

    let frameCenter = center;
    let frameBearing = bearing;
    let framePitch = pitch;
    let frameZoom = zoom;
    let frameLeftPadding = fullLeftPadding;

    if (stageStartFrames > 1 && frame < stageStartFrames) {
      const flyInFrame = Math.max(0, frame - introCardFrames);
      const introProgress = easeInOutCubic(
        clamp(flyInFrame / flyInFrames, 0, 1)
      );
      const introStartBearing =
        (targetBearing + introCamera.bearingOffsetDegrees + 360) % 360;
      const introStartPitch = Math.max(
        introCamera.minPitch,
        targetPitch + introCamera.pitchDelta
      );
      const introStartZoom = Math.max(
        introCamera.minZoom,
        targetZoom + introCamera.zoomDelta
      );

      frameCenter = lerpLonLat(introStartCenter, center, introProgress);
      frameBearing = lerpBearing(introStartBearing, bearing, introProgress);
      framePitch =
        introStartPitch + (pitch - introStartPitch) * introProgress;
      frameZoom = introStartZoom + (zoom - introStartZoom) * introProgress;
      frameLeftPadding =
        neutralLeftPadding +
        (fullLeftPadding - neutralLeftPadding) * introProgress;
    }

    states.push({
      distance,
      center: frameCenter,
      bearing: frameBearing,
      cameraTerrainAltitudeMeters: terrainAltitude,
      pitch: framePitch,
      zoom: frameZoom,
      trackerPoint,
      leftPadding: frameLeftPadding,
    });
  }

  return states;
};
