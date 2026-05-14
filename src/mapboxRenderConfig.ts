import mapboxgl from "mapbox-gl";

type TerrainTransform = {
  _calcMatrices?: () => void;
  _centerAltitude?: number;
  _centerAltitudeValidForExaggeration?: number;
  _updateSeaLevelZoom?: () => void;
  elevation?: { exaggeration?: () => number };
};

export type SmoothedCameraTerrainAltitudeState = {
  frame: number | null;
  altitudeMeters: number | null;
};

let configured = false;

export const configureMapboxForRendering = () => {
  if (configured) return;
  configured = true;

  mapboxgl.workerCount = 1;
  mapboxgl.maxParallelImageRequests = 8;
};

const getNumericTerrainExaggeration = (map: mapboxgl.Map) => {
  const transform = getTerrainTransform(map);
  const transformExaggeration = transform?.elevation?.exaggeration?.();
  if (
    transformExaggeration !== undefined &&
    Number.isFinite(transformExaggeration)
  ) {
    return transformExaggeration;
  }

  const terrain = map.getTerrain();
  if (!terrain) return 0;

  return typeof terrain.exaggeration === "number" ? terrain.exaggeration : 1;
};

const getTerrainTransform = (map: mapboxgl.Map) =>
  (map as unknown as { transform?: TerrainTransform }).transform;

const applySmoothedAltitudeToTransform = (
  map: mapboxgl.Map,
  transform: TerrainTransform,
  altitudeMeters: number,
  recalculate: boolean
) => {
  const terrainExaggeration = getNumericTerrainExaggeration(map);
  if (terrainExaggeration <= 0) return;

  transform._centerAltitude = Math.max(0, altitudeMeters * terrainExaggeration);
  transform._centerAltitudeValidForExaggeration = terrainExaggeration;
  transform._updateSeaLevelZoom?.();
  if (recalculate) {
    transform._calcMatrices?.();
  }
};

export const applySmoothedCameraTerrainAltitude = (
  map: mapboxgl.Map,
  altitudeMeters: number | null | undefined
) => {
  if (altitudeMeters === null || altitudeMeters === undefined) return;

  const transform = getTerrainTransform(map);
  if (!transform) return;

  applySmoothedAltitudeToTransform(map, transform, altitudeMeters, true);
};

const readRawTerrainElevation = (
  map: mapboxgl.Map,
  center: mapboxgl.LngLatLike
) => {
  const elevation = map.queryTerrainElevation(center, { exaggerated: false });
  return elevation !== null && Number.isFinite(elevation) ? elevation : null;
};

const terrainAltitudeAlpha = (
  previousFrame: number,
  frame: number,
  fps: number,
  halfLifeSeconds: number
) => {
  if (halfLifeSeconds <= 0) return 1;
  return 1 - 2 ** (-(frame - previousFrame) / (halfLifeSeconds * fps));
};

export const resolveSmoothedCameraTerrainAltitude = ({
  map,
  center,
  fallbackAltitudeMeters,
  frame,
  fps,
  halfLifeSeconds,
  state,
}: {
  map: mapboxgl.Map;
  center: mapboxgl.LngLatLike;
  fallbackAltitudeMeters: number | null | undefined;
  frame: number;
  fps: number;
  halfLifeSeconds: number;
  state: SmoothedCameraTerrainAltitudeState;
}) => {
  const sampledAltitude = readRawTerrainElevation(map, center);
  const targetAltitude = sampledAltitude ?? fallbackAltitudeMeters ?? null;

  if (targetAltitude === null) {
    return state.altitudeMeters;
  }

  if (
    state.altitudeMeters === null ||
    state.frame === null ||
    frame <= state.frame ||
    frame - state.frame > fps * 2
  ) {
    state.frame = frame;
    state.altitudeMeters = targetAltitude;
    return state.altitudeMeters;
  }

  const alpha = terrainAltitudeAlpha(
    state.frame,
    frame,
    fps,
    halfLifeSeconds
  );
  state.frame = frame;
  state.altitudeMeters =
    state.altitudeMeters + (targetAltitude - state.altitudeMeters) * alpha;

  return state.altitudeMeters;
};
