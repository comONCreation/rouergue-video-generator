import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
} from "geojson";

export type LonLat = [number, number];

export type WaypointKind = "start" | "finish" | "public-zone" | "standard";

export type GpxWaypoint = {
  name: string;
  kind: WaypointKind;
  coordinates: LonLat;
};

export type DisplayWaypoint = GpxWaypoint & {
  revealDistanceMeters?: number;
  hideDistanceMeters?: number;
};

export type ParsedGpx = {
  name: string;
  coordinates: LonLat[];
  cumulativeDistances: number[];
  totalDistanceMeters: number;
  elevations?: Array<number | null>;
  waypoints: GpxWaypoint[];
};

const EARTH_RADIUS_METERS = 6371008.8;

const toRad = (degrees: number) => (degrees * Math.PI) / 180;

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const getElements = (root: Document | Element, tagName: string): Element[] =>
  Array.from(root.getElementsByTagNameNS("*", tagName));

const getChildText = (node: Element, tagName: string) =>
  getElements(node, tagName)[0]?.textContent?.trim() ?? "";

const readLonLat = (node: Element): LonLat | null => {
  const lat = Number(node.getAttribute("lat"));
  const lon = Number(node.getAttribute("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return [lon, lat];
};

const readElevation = (node: Element): number | null => {
  const text = getChildText(node, "ele");
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

const classifyWaypoint = (name: string, symbol: string): WaypointKind => {
  const normalizedName = normalizeText(name);
  const normalizedSymbol = normalizeText(symbol);

  if (normalizedName.includes("depart")) return "start";
  if (normalizedName.includes("arrivee")) return "finish";
  if (/^zp\s*\d+\b/.test(normalizedName) || normalizedSymbol === "zp") {
    return "public-zone";
  }

  return "standard";
};

export const distanceMeters = (a: LonLat, b: LonLat) => {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const bearingDegrees = (a: LonLat, b: LonLat) => {
  const lon1 = toRad(a[0]);
  const lon2 = toRad(b[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const interpolateLonLat = (a: LonLat, b: LonLat, progress: number): LonLat => [
  a[0] + (b[0] - a[0]) * progress,
  a[1] + (b[1] - a[1]) * progress,
];

const computeCumulativeDistances = (coordinates: LonLat[]) => {
  const cumulativeDistances = [0];
  let total = 0;

  for (let i = 1; i < coordinates.length; i++) {
    total += distanceMeters(coordinates[i - 1], coordinates[i]);
    cumulativeDistances.push(total);
  }

  return cumulativeDistances;
};

export const parseGpx = (gpxText: string): ParsedGpx => {
  const document = new DOMParser().parseFromString(gpxText, "application/xml");
  const parserError = getElements(document, "parsererror")[0];

  if (parserError) {
    throw new Error(parserError.textContent ?? "Impossible de parser le GPX.");
  }

  const trackName =
    getChildText(getElements(document, "trk")[0] ?? document.documentElement, "name") ||
    "Trace GPX";

  const trackPoints = getElements(document, "trkpt")
    .map((trackPoint) => {
      const coordinates = readLonLat(trackPoint);
      if (!coordinates) return null;
      return {
        coordinates,
        elevation: readElevation(trackPoint),
      };
    })
    .filter(
      (
        trackPoint
      ): trackPoint is { coordinates: LonLat; elevation: number | null } =>
        trackPoint !== null
    );

  const coordinates = trackPoints.map((trackPoint) => trackPoint.coordinates);
  const elevations = trackPoints.map((trackPoint) => trackPoint.elevation);

  if (coordinates.length < 2) {
    throw new Error("Le GPX ne contient pas assez de points de trace.");
  }

  const waypoints = getElements(document, "wpt")
    .map((waypoint): GpxWaypoint | null => {
      const coordinates = readLonLat(waypoint);
      if (!coordinates) return null;

      const name = getChildText(waypoint, "name") || "Point";
      const symbol = getChildText(waypoint, "sym");

      return {
        name,
        kind: classifyWaypoint(name, symbol),
        coordinates,
      };
    })
    .filter((waypoint): waypoint is GpxWaypoint => waypoint !== null);

  const cumulativeDistances = computeCumulativeDistances(coordinates);

  return {
    name: trackName,
    coordinates,
    elevations,
    cumulativeDistances,
    totalDistanceMeters: cumulativeDistances[cumulativeDistances.length - 1],
    waypoints,
  };
};

export const elevationAtDistance = (
  route: Pick<
    ParsedGpx,
    "cumulativeDistances" | "elevations" | "totalDistanceMeters"
  >,
  distance: number
): number | null => {
  const elevations = route.elevations;
  if (!elevations || elevations.length < 2) return null;

  const target = Math.max(0, Math.min(route.totalDistanceMeters, distance));
  const { cumulativeDistances } = route;

  let low = 1;
  let high = cumulativeDistances.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (cumulativeDistances[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const index = low;
  const from = elevations[index - 1];
  const to = elevations[index];
  if (from === null || to === null) return from ?? to ?? null;

  const segmentStartDistance = cumulativeDistances[index - 1];
  const segmentDistance = cumulativeDistances[index] - segmentStartDistance;
  const localProgress =
    segmentDistance === 0 ? 0 : (target - segmentStartDistance) / segmentDistance;

  return from + (to - from) * localProgress;
};

export const pointAtDistance = (route: ParsedGpx, distance: number) => {
  const target = Math.max(0, Math.min(route.totalDistanceMeters, distance));
  const { coordinates, cumulativeDistances } = route;

  let low = 1;
  let high = cumulativeDistances.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (cumulativeDistances[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const index = low;
  const segmentStartDistance = cumulativeDistances[index - 1];
  const segmentDistance = cumulativeDistances[index] - segmentStartDistance;
  const localProgress =
    segmentDistance === 0 ? 0 : (target - segmentStartDistance) / segmentDistance;
  const point = interpolateLonLat(
    coordinates[index - 1],
    coordinates[index],
    localProgress
  );

  return {
    point,
    bearing: bearingDegrees(coordinates[index - 1], coordinates[index]),
    index,
  };
};

export const routeDistanceAtPoint = (
  route: Pick<ParsedGpx, "coordinates" | "cumulativeDistances">,
  point: LonLat
) => {
  let bestDistance = route.cumulativeDistances[0] ?? 0;
  let bestError = Number.POSITIVE_INFINITY;

  for (let i = 1; i < route.coordinates.length; i++) {
    const from = route.coordinates[i - 1];
    const to = route.coordinates[i];
    const latScale = Math.cos(toRad(from[1]));
    const toX = toRad(to[0] - from[0]) * EARTH_RADIUS_METERS * latScale;
    const toY = toRad(to[1] - from[1]) * EARTH_RADIUS_METERS;
    const pointX = toRad(point[0] - from[0]) * EARTH_RADIUS_METERS * latScale;
    const pointY = toRad(point[1] - from[1]) * EARTH_RADIUS_METERS;
    const segmentLengthSquared = toX * toX + toY * toY;
    const progress =
      segmentLengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, (pointX * toX + pointY * toY) / segmentLengthSquared)
          );
    const projectedX = toX * progress;
    const projectedY = toY * progress;
    const error =
      (pointX - projectedX) * (pointX - projectedX) +
      (pointY - projectedY) * (pointY - projectedY);

    if (error < bestError) {
      bestError = error;
      bestDistance =
        route.cumulativeDistances[i - 1] +
        (route.cumulativeDistances[i] - route.cumulativeDistances[i - 1]) *
          progress;
    }
  }

  return bestDistance;
};

export const routeCoordinatesUntilDistance = (
  route: ParsedGpx,
  distance: number
) => {
  const target = Math.max(0, Math.min(route.totalDistanceMeters, distance));
  const { coordinates, cumulativeDistances } = route;

  if (target <= 0) {
    return [coordinates[0], coordinates[1]];
  }

  const visibleCoordinates: LonLat[] = [coordinates[0]];

  for (let i = 1; i < coordinates.length; i++) {
    if (cumulativeDistances[i] <= target) {
      visibleCoordinates.push(coordinates[i]);
      continue;
    }

    const segmentStartDistance = cumulativeDistances[i - 1];
    const segmentDistance = cumulativeDistances[i] - segmentStartDistance;
    const localProgress =
      segmentDistance === 0 ? 0 : (target - segmentStartDistance) / segmentDistance;

    visibleCoordinates.push(
      interpolateLonLat(coordinates[i - 1], coordinates[i], localProgress)
    );
    break;
  }

  return visibleCoordinates.length >= 2
    ? visibleCoordinates
    : [coordinates[0], coordinates[1]];
};

export const routeFeature = (
  coordinates: LonLat[]
): Feature<LineString, Record<string, never>> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates,
  },
});

export const waypointCollection = (
  waypoints: DisplayWaypoint[]
): FeatureCollection<
  Point,
  {
    kind: WaypointKind;
    label: string;
    name: string;
    revealDistanceMeters: number;
    hideDistanceMeters: number;
  }
> => ({
  type: "FeatureCollection",
  features: waypoints.map((waypoint) => ({
    type: "Feature",
    properties: {
      kind: waypoint.kind,
      label:
        waypoint.kind === "public-zone"
          ? ""
          : waypoint.name.replace(/\s*\(.+\)\s*$/, ""),
      name: waypoint.name,
      revealDistanceMeters: waypoint.revealDistanceMeters ?? 0,
      hideDistanceMeters: waypoint.hideDistanceMeters ?? Number.MAX_SAFE_INTEGER,
    },
    geometry: {
      type: "Point",
      coordinates: waypoint.coordinates,
    },
  })),
});
