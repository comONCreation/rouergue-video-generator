import type { Feature, Point } from "geojson";
import {
  bearingDegrees,
  distanceMeters,
  pointAtDistance,
  type LonLat,
  type ParsedGpx,
} from "../route/gpx";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const easeInOutCubic = (value: number) =>
  value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2;

const smoothStepIntegral = (value: number) => value ** 3 - 0.5 * value ** 4;

export const easedTravelProgress = (
  elapsedSeconds: number,
  totalSeconds: number,
  easeSeconds: number
) => {
  if (totalSeconds <= 0) return 1;
  const elapsed = clamp(elapsedSeconds, 0, totalSeconds);
  const ease = clamp(easeSeconds, 0, totalSeconds / 2);
  if (ease <= 0) return elapsed / totalSeconds;

  const cruiseArea = totalSeconds - ease;
  if (elapsed < ease) {
    return (ease * smoothStepIntegral(elapsed / ease)) / cruiseArea;
  }

  if (elapsed <= totalSeconds - ease) {
    return (ease * 0.5 + (elapsed - ease)) / cruiseArea;
  }

  const remaining = totalSeconds - elapsed;
  return 1 - (ease * smoothStepIntegral(remaining / ease)) / cruiseArea;
};

export const lerpLonLat = (from: LonLat, to: LonLat, alpha: number): LonLat => [
  from[0] + (to[0] - from[0]) * alpha,
  from[1] + (to[1] - from[1]) * alpha,
];

export const shortestAngleDelta = (from: number, to: number) =>
  ((((to - from) % 360) + 540) % 360) - 180;

export const lerpBearing = (from: number, to: number, alpha: number) =>
  (from + shortestAngleDelta(from, to) * alpha + 360) % 360;

export const halfLifeAlpha = (halfLifeSeconds: number, fps: number) => {
  if (halfLifeSeconds <= 0) return 1;
  return 1 - 2 ** (-1 / (halfLifeSeconds * fps));
};

export const getSmoothingWindow = (
  totalDistanceMeters: number,
  config: { minMeters: number; maxMeters: number; routeDistanceRatio: number }
) =>
  clamp(
    totalDistanceMeters * config.routeDistanceRatio,
    config.minMeters,
    config.maxMeters
  );

const getOddSampleCount = (sampleCount: number) =>
  Math.max(3, Math.ceil(sampleCount) | 1);

export const getSmoothedBearing = (
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

  return (
    ((Math.atan2(y / weightTotal, x / weightTotal) * 180) / Math.PI + 360) % 360
  );
};

export const pointFeature = (coordinates: LonLat): Feature<Point> => ({
  type: "Feature",
  properties: {},
  geometry: { type: "Point", coordinates },
});
