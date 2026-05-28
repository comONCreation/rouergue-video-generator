import {
  distanceMeters,
  isRecoWaypointName,
  routeDistanceAtPoint,
  type DisplayWaypoint,
  type GpxWaypoint,
  type WaypointKind,
} from "../route/gpx";
import { SEGMENTS, type Segment } from "../data/segments";
import { mapRoute } from "../theme";
import type { StagedRoute } from "../route/stagedRoute";

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
  // Les waypoints "reco" (reco ES 15) référencent une ES précise dans leur nom :
  // pas de renumérotation contextuelle, sinon "ES 15" devient "ES 12" via
  // findAdjacentEsNumber sur la liaison parente.
  if (isRecoWaypointName(waypoint.name)) return waypoint;
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

export type WaypointCluster = {
  variants: WaypointVariant[];
};

export const buildWaypointClusters = (
  route: StagedRoute
): WaypointCluster[] => {
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
// segment actif (pour conserver le contexte, ex. "ES 5" plutôt que "ES 1"),
// puis variante déjà passée (un waypoint révélé doit le rester), puis segment
// le plus proche en index, puis type le plus signifiant.
const scoreVariant = (variant: WaypointVariant, activeSegmentIndex: number) => {
  const isActive = variant.segmentIndex === activeSegmentIndex ? 1 : 0;
  const isPast = variant.segmentIndex < activeSegmentIndex ? 1 : 0;
  const proximity = -Math.abs(variant.segmentIndex - activeSegmentIndex);
  return [
    isActive,
    isPast,
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

// Les variantes "reco" (Départ/Arrivée reco ES 15) coïncident en coordonnées
// avec les vrais départ/arrivée d'ES 15. Hors de la liaison parente, elles ne
// doivent jamais être sélectionnées par le picker — sinon, comme le marker
// layer ne se base que sur revealDistanceMeters, le pin reste affiché dans
// toutes les liaisons et spéciales suivantes jusqu'à ce qu'une autre variante
// prenne la main.
const isRecoVariantOutOfScope = (
  variant: WaypointVariant,
  activeSegmentIndex: number
): boolean =>
  isRecoWaypointName(variant.decorated.name) &&
  variant.segmentIndex !== activeSegmentIndex;

// Retourne `null` si le cluster ne contient que des variantes reco hors champ
// (cas où aucun vrai pin ne coïncide). On préfère ne rien afficher plutôt que
// de retomber sur la variante reco — l'objectif de la filtration serait sinon
// annulé par le fallback.
const pickVariantForActiveSegment = (
  cluster: WaypointCluster,
  activeSegmentIndex: number
): DisplayWaypoint | null => {
  const inScope = cluster.variants.filter(
    (v) => !isRecoVariantOutOfScope(v, activeSegmentIndex)
  );
  if (inScope.length === 0) return null;
  return inScope.reduce((best, candidate) =>
    compareScores(
      scoreVariant(candidate, activeSegmentIndex),
      scoreVariant(best, activeSegmentIndex)
    ) > 0
      ? candidate
      : best
  ).decorated;
};

export const buildActiveDisplayWaypoints = (
  clusters: WaypointCluster[],
  activeSegmentIndex: number
): DisplayWaypoint[] =>
  clusters
    .map((c) => pickVariantForActiveSegment(c, activeSegmentIndex))
    .filter((waypoint): waypoint is DisplayWaypoint => waypoint !== null);
