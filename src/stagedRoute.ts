import { staticFile } from "remotion";
import {
  distanceMeters,
  parseGpx,
  type GpxWaypoint,
  type LonLat,
  type ParsedGpx,
} from "./gpx";
import type { Segment } from "./data/segments";
import { getGpxPathForSegment } from "./data/gpxFiles";

export type StagedSegmentSpan = {
  segment: Segment;
  startIndex: number;
  endIndex: number;
  startDistance: number;
  endDistance: number;
  coordinates: LonLat[];
  localCumulative: number[];
};

export type StagedWaypoint = GpxWaypoint & { segmentId: string };

export type StagedRoute = {
  coordinates: LonLat[];
  cumulativeDistances: number[];
  totalDistanceMeters: number;
  segments: StagedSegmentSpan[];
  waypoints: StagedWaypoint[];
  segmentRoutes: { segment: Segment; route: ParsedGpx }[];
};

const DEDUPE_THRESHOLD_METERS = 0.5;

const interpolateLonLat = (a: LonLat, b: LonLat, t: number): LonLat => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

export const loadStagedRoute = async (
  segments: Segment[]
): Promise<StagedRoute> => {
  const parsed: { segment: Segment; route: ParsedGpx }[] = [];
  for (const segment of segments) {
    const gpxPath = getGpxPathForSegment(segment);
    if (!gpxPath) {
      throw new Error(`GPX manquant pour le segment ${segment.id}`);
    }
    const response = await fetch(staticFile(gpxPath));
    if (!response.ok) {
      throw new Error(`GPX introuvable : ${gpxPath}`);
    }
    const route = parseGpx(await response.text());
    parsed.push({ segment, route });
  }

  const coordinates: LonLat[] = [];
  const segmentBoundsByIndex: {
    segment: Segment;
    startIndex: number;
    endIndex: number;
  }[] = [];

  for (const { segment, route } of parsed) {
    const startIndex = coordinates.length;
    for (const coord of route.coordinates) {
      const last = coordinates[coordinates.length - 1];
      if (last && distanceMeters(last, coord) < DEDUPE_THRESHOLD_METERS) continue;
      coordinates.push(coord);
    }
    const endIndex = coordinates.length - 1;
    if (endIndex >= startIndex) {
      segmentBoundsByIndex.push({ segment, startIndex, endIndex });
    }
  }

  if (coordinates.length < 2) {
    throw new Error("Route concaténée trop courte.");
  }

  const cumulativeDistances: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    cumulativeDistances.push(
      cumulativeDistances[i - 1] +
        distanceMeters(coordinates[i - 1], coordinates[i])
    );
  }

  const segments_: StagedSegmentSpan[] = segmentBoundsByIndex.map(
    ({ segment, startIndex, endIndex }) => {
      const spanCoords = coordinates.slice(startIndex, endIndex + 1);
      const localCumulative: number[] = [0];
      for (let i = 1; i < spanCoords.length; i++) {
        localCumulative.push(
          localCumulative[i - 1] +
            distanceMeters(spanCoords[i - 1], spanCoords[i])
        );
      }
      return {
        segment,
        startIndex,
        endIndex,
        startDistance: cumulativeDistances[startIndex],
        endDistance: cumulativeDistances[endIndex],
        coordinates: spanCoords,
        localCumulative,
      };
    }
  );

  const waypoints: StagedWaypoint[] = parsed.flatMap(({ segment, route }) =>
    route.waypoints.map((wp) => ({ ...wp, segmentId: segment.id }))
  );

  return {
    coordinates,
    cumulativeDistances,
    totalDistanceMeters: cumulativeDistances[cumulativeDistances.length - 1],
    segments: segments_,
    waypoints,
    segmentRoutes: parsed,
  };
};

export const findActiveSegmentSpan = (
  route: StagedRoute,
  distance: number
): StagedSegmentSpan => {
  for (const span of route.segments) {
    if (distance <= span.endDistance) return span;
  }
  return route.segments[route.segments.length - 1];
};

export const spanCoordinatesUntilDistance = (
  span: StagedSegmentSpan,
  globalDistance: number
): LonLat[] => {
  if (globalDistance <= span.startDistance) return [];
  if (globalDistance >= span.endDistance) return span.coordinates;

  const localTarget = globalDistance - span.startDistance;
  const result: LonLat[] = [span.coordinates[0]];
  for (let i = 1; i < span.coordinates.length; i++) {
    if (span.localCumulative[i] <= localTarget) {
      result.push(span.coordinates[i]);
      continue;
    }
    const segmentDelta =
      span.localCumulative[i] - span.localCumulative[i - 1];
    const t =
      segmentDelta === 0
        ? 0
        : (localTarget - span.localCumulative[i - 1]) / segmentDelta;
    result.push(
      interpolateLonLat(span.coordinates[i - 1], span.coordinates[i], t)
    );
    break;
  }
  return result;
};
