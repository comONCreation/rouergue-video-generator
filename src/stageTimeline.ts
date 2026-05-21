import {
  distanceMeters,
  type GpxWaypoint,
  type LonLat,
} from "./gpx";
import { easedTravelProgress } from "./cameraPath";
import type { Segment } from "./data/segments";
import { mapCamera, mapRoute, stageIntro } from "./theme";
import type { StagedRoute, StagedSegmentSpan } from "./stagedRoute";
import { buildFirstWaypointMediaEntries } from "./data/waypointMedia";
import { formatStageTitle } from "./rally.config";

export type KeyPointType =
  | "stage-start"
  | "stage-finish"
  | "es-start"
  | "es-finish"
  | "assistance"
  | "regrouping";

export type StageKeyPoint = {
  type: KeyPointType;
  distance: number;
  segment: Segment;
  label: string;
  subtitle?: string;
  rawWaypoint?: GpxWaypoint;
  holdSeconds: number;
};

export type Phase =
  | {
      kind: "hold";
      keyPointIndex: number;
      startTime: number;
      endTime: number;
    }
  | {
      kind: "transit";
      fromIndex: number;
      toIndex: number;
      startTime: number;
      endTime: number;
    };

export type StageTimeline = {
  keyPoints: StageKeyPoint[];
  phases: Phase[];
  totalSeconds: number;
};

const TYPE_PRIORITY: Record<KeyPointType, number> = {
  "stage-start": 5,
  "stage-finish": 5,
  "es-start": 4,
  "es-finish": 4,
  assistance: 3,
  regrouping: 3,
};

const holdSecondsForType = (type: KeyPointType): number => {
  if (type === "stage-start") {
    return stageIntro.card.durationSeconds + stageIntro.flyInSeconds;
  }
  return mapCamera.stageVideo.keyPointHoldSeconds.default;
};

const findDistanceForCoordinateInSpan = (
  route: StagedRoute,
  span: StagedSegmentSpan,
  coordinate: LonLat
): number | null => {
  let bestDist = Infinity;
  let bestIndex = -1;
  for (let i = span.startIndex; i <= span.endIndex; i++) {
    const d = distanceMeters(route.coordinates[i], coordinate);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) return null;
  return route.cumulativeDistances[bestIndex];
};

const classifyKeyPoint = (waypoint: GpxWaypoint): KeyPointType | null => {
  // Les ZP ne déclenchent pas d'arrêt — affichées uniquement comme pins sur la
  // carte, sans pause de la caméra ni overlay.
  if (waypoint.kind === "public-zone") return null;
  const lowered = waypoint.name.toLowerCase();
  if (lowered.includes("assistance")) return "assistance";
  if (lowered.includes("regroupement")) return "regrouping";
  if (waypoint.kind === "start") return "es-start";
  if (waypoint.kind === "finish") return "es-finish";
  return null;
};

const buildLabel = (
  type: KeyPointType,
  waypoint: GpxWaypoint | undefined,
  segment: Segment
): { label: string; subtitle?: string } => {
  if (type === "stage-start") {
    return {
      label: waypoint?.name ?? segment.fromLocation ?? "Départ",
      subtitle: formatStageTitle(segment.stage),
    };
  }
  if (type === "stage-finish") {
    return {
      label: segment.toLocation ?? "Arrivée",
      subtitle: formatStageTitle(segment.stage),
    };
  }
  if (!waypoint) {
    return { label: segment.title };
  }
  if (type === "assistance") {
    return { label: waypoint.name, subtitle: "Assistance" };
  }
  if (type === "regrouping") {
    return { label: waypoint.name, subtitle: "Regroupement" };
  }
  return { label: waypoint.name.replace(/\n/g, " ") };
};

const computeTransitSpeedKmh = (
  route: StagedRoute,
  fromDistance: number,
  toDistance: number
): number => {
  let esLength = 0;
  let liaisonLength = 0;
  for (const span of route.segments) {
    const overlap =
      Math.max(0, Math.min(toDistance, span.endDistance)) -
      Math.max(fromDistance, span.startDistance);
    if (overlap <= 0) continue;
    if (span.segment.type === "ES") esLength += overlap;
    else liaisonLength += overlap;
  }
  const totalLength = esLength + liaisonLength;
  if (totalLength <= 0) return mapCamera.cameraSpeed.liaison;
  const esSpeedMs = mapCamera.cameraSpeed.es / 3.6;
  const liaisonSpeedMs = mapCamera.cameraSpeed.liaison / 3.6;
  const totalTime = esLength / esSpeedMs + liaisonLength / liaisonSpeedMs;
  if (totalTime <= 0) return mapCamera.cameraSpeed.liaison;
  return (totalLength / totalTime) * 3.6;
};

export const buildStageTimeline = (route: StagedRoute): StageTimeline => {
  const collected: StageKeyPoint[] = [];

  const firstSpan = route.segments[0];
  const lastSpan = route.segments[route.segments.length - 1];
  const firstWaypoint = route.segmentRoutes[0]?.route.waypoints.find(
    (waypoint) => waypoint.kind !== "public-zone"
  );

  const startLabel = buildLabel(
    "stage-start",
    firstWaypoint,
    firstSpan.segment
  );
  collected.push({
    type: "stage-start",
    distance: 0,
    segment: firstSpan.segment,
    label: startLabel.label,
    subtitle: startLabel.subtitle,
    rawWaypoint: firstWaypoint,
    holdSeconds: holdSecondsForType("stage-start"),
  });

  for (let i = 0; i < route.segmentRoutes.length; i++) {
    const { segment, route: parsed } = route.segmentRoutes[i];
    const span = route.segments[i];
    if (!span) continue;
    for (const waypoint of parsed.waypoints) {
      const type = classifyKeyPoint(waypoint);
      if (!type) continue;
      const distance = findDistanceForCoordinateInSpan(
        route,
        span,
        waypoint.coordinates
      );
      if (distance === null) continue;
      const { label, subtitle } = buildLabel(type, waypoint, segment);
      collected.push({
        type,
        distance,
        segment,
        label,
        subtitle,
        rawWaypoint: waypoint,
        holdSeconds: holdSecondsForType(type),
      });
    }
  }

  const finishLabel = buildLabel("stage-finish", undefined, lastSpan.segment);
  collected.push({
    type: "stage-finish",
    distance: route.totalDistanceMeters,
    segment: lastSpan.segment,
    label: finishLabel.label,
    subtitle: finishLabel.subtitle,
    holdSeconds: holdSecondsForType("stage-finish"),
  });

  collected.sort((a, b) => a.distance - b.distance);

  const keyPoints: StageKeyPoint[] = [];
  for (const kp of collected) {
    const prev = keyPoints[keyPoints.length - 1];
    if (
      prev &&
      Math.abs(kp.distance - prev.distance) <
        mapRoute.thresholds.coincidentKeyPointsMeters
    ) {
      // À distance ~égale, le doublon vient typiquement des waypoints
      // partagés à la jonction de deux GPX consécutifs. À priorité égale,
      // on garde le point côté segment à parcourir afin que l'overlay et la
      // caméra annoncent directement ce qui démarre.
      if (TYPE_PRIORITY[kp.type] >= TYPE_PRIORITY[prev.type]) {
        keyPoints[keyPoints.length - 1] = kp;
      }
      continue;
    }
    keyPoints.push(kp);
  }

  for (const { index, cue } of buildFirstWaypointMediaEntries(keyPoints)) {
    const keyPoint = keyPoints[index];
    keyPoints[index] = {
      ...keyPoint,
      holdSeconds:
        keyPoint.type === "stage-start"
          ? keyPoint.holdSeconds + cue.holdSeconds
          : Math.max(keyPoint.holdSeconds, cue.holdSeconds),
    };
  }

  const phases: Phase[] = [];
  let cursor = 0;
  for (let i = 0; i < keyPoints.length; i++) {
    const kp = keyPoints[i];
    phases.push({
      kind: "hold",
      keyPointIndex: i,
      startTime: cursor,
      endTime: cursor + kp.holdSeconds,
    });
    cursor += kp.holdSeconds;

    if (i < keyPoints.length - 1) {
      const next = keyPoints[i + 1];
      const gapMeters = Math.max(0, next.distance - kp.distance);
      const speedKmh = computeTransitSpeedKmh(route, kp.distance, next.distance);
      const speedBasedSeconds = (gapMeters / 1000 / speedKmh) * 3600;
      const transitSeconds = speedBasedSeconds + mapCamera.travelEaseSeconds;
      phases.push({
        kind: "transit",
        fromIndex: i,
        toIndex: i + 1,
        startTime: cursor,
        endTime: cursor + transitSeconds,
      });
      cursor += transitSeconds;
    }
  }

  return {
    keyPoints,
    phases,
    totalSeconds: cursor,
  };
};

export const getDistanceAtTime = (
  timeline: StageTimeline,
  time: number
): number => {
  if (timeline.keyPoints.length === 0) return 0;
  for (const phase of timeline.phases) {
    if (time < phase.endTime) {
      if (phase.kind === "hold") {
        return timeline.keyPoints[phase.keyPointIndex].distance;
      }
      const localT =
        (time - phase.startTime) /
        Math.max(1e-6, phase.endTime - phase.startTime);
      const eased = easedTravelProgress(
        localT * (phase.endTime - phase.startTime),
        phase.endTime - phase.startTime,
        mapCamera.travelEaseSeconds
      );
      const from = timeline.keyPoints[phase.fromIndex].distance;
      const to = timeline.keyPoints[phase.toIndex].distance;
      return from + (to - from) * eased;
    }
  }
  return timeline.keyPoints[timeline.keyPoints.length - 1].distance;
};

export type ActiveContext = {
  phase: Phase;
  currentKeyPoint: StageKeyPoint | null;
  upcomingKeyPoint: StageKeyPoint | null;
  holdLocalProgress: number; // 0..1 if in a hold, else 0
  transitLocalProgress: number; // 0..1 if in transit, else 0
};

export const getStageIntroHoldSeconds = (timeline: StageTimeline): number => {
  const firstPhase = timeline.phases[0];
  if (!firstPhase || firstPhase.kind !== "hold") return 0;
  const keyPoint = timeline.keyPoints[firstPhase.keyPointIndex];
  if (keyPoint?.type !== "stage-start") return 0;
  return Math.max(0, firstPhase.endTime - firstPhase.startTime);
};

export const getStageIntroCardSeconds = (timeline: StageTimeline): number => {
  const holdSeconds = getStageIntroHoldSeconds(timeline);
  return Math.min(holdSeconds, stageIntro.card.durationSeconds);
};

export const getStageIntroMotionSeconds = (timeline: StageTimeline): number =>
  Math.min(
    getStageIntroHoldSeconds(timeline),
    stageIntro.card.durationSeconds + stageIntro.flyInSeconds
  );

export const getActiveContext = (
  timeline: StageTimeline,
  time: number
): ActiveContext | null => {
  for (const phase of timeline.phases) {
    if (time < phase.endTime) {
      if (phase.kind === "hold") {
        const local = (time - phase.startTime) / (phase.endTime - phase.startTime);
        return {
          phase,
          currentKeyPoint: timeline.keyPoints[phase.keyPointIndex],
          upcomingKeyPoint:
            timeline.keyPoints[phase.keyPointIndex + 1] ?? null,
          holdLocalProgress: Math.max(0, Math.min(1, local)),
          transitLocalProgress: 0,
        };
      }
      const local = (time - phase.startTime) / (phase.endTime - phase.startTime);
      return {
        phase,
        currentKeyPoint: null,
        upcomingKeyPoint: timeline.keyPoints[phase.toIndex],
        holdLocalProgress: 0,
        transitLocalProgress: Math.max(0, Math.min(1, local)),
      };
    }
  }
  return null;
};
