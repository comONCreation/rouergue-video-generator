import mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
import {
  distanceMeters,
  waypointCollection,
  type DisplayWaypoint,
} from "../route/gpx";
import { mapPins, mapRoute, stageRecap } from "../theme";
import type { StagedRoute, StagedSegmentSpan } from "../route/stagedRoute";
import { PIN_IDS, SOURCE_IDS } from "./mapLayers";
import {
  SEGMENT_COLOR_EXPRESSION,
  buildAllRouteFeatures,
} from "./continuousRouteFeatures";

const PUBLIC_ZONES_SOURCE_ID = "recap-public-zones";
const ES_LABELS_SOURCE_ID = "recap-es-labels";

// IDs de couches distincts des IDs de sources (lisibilité : éviter qu'une
// couche et sa source portent la même chaîne).
const LAYER_IDS = {
  routeOutline: "recap-route-outline",
  routeCore: "recap-route-core",
  publicZones: "recap-public-zone-pins",
  esLabels: "recap-es-label-text",
} as const;

const buildRecapLineWidth = (
  extraWidth: number
): mapboxgl.ExpressionSpecification => {
  const { lineWidthStops } = stageRecap.route;
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    lineWidthStops.lowZoom,
    lineWidthStops.lowWidth + extraWidth,
    lineWidthStops.midZoom,
    lineWidthStops.midWidth + extraWidth,
    lineWidthStops.highZoom,
    lineWidthStops.highWidth + extraWidth,
  ];
};

// Cadre englobant de toute la trace de l'étape, pour le fitBounds.
export const buildStageRecapBounds = (
  route: StagedRoute
): mapboxgl.LngLatBounds => {
  const bounds = new mapboxgl.LngLatBounds();
  for (const coordinate of route.coordinates) {
    bounds.extend(coordinate);
  }
  return bounds;
};

// Zones publiques de l'étape, dédupliquées par proximité : un même lieu
// revient dans plusieurs GPX (boucles répétées), on ne garde qu'un pin.
export const buildStageRecapPublicZones = (
  route: StagedRoute
): DisplayWaypoint[] => {
  const zones: DisplayWaypoint[] = [];
  for (const waypoint of route.waypoints) {
    if (waypoint.kind !== "public-zone") continue;
    const alreadyShown = zones.some(
      (zone) =>
        distanceMeters(zone.coordinates, waypoint.coordinates) <=
        mapRoute.thresholds.clusterRadiusMeters
    );
    if (alreadyShown) continue;
    zones.push({ ...waypoint });
  }
  return zones;
};

// Libellés des spéciales avec leurs numéros de passage fusionnés. Une étape
// rejoue les mêmes ES (ex. ES 1 = ES 5 = Campuac-Espeyrac) : on regroupe par
// nom de spéciale et on liste les numéros ("ES 1-5 Campuac-Espeyrac"). Le
// libellé est posé au milieu de la trace de la spéciale, puis décalé
// manuellement par l'offset (x, y) ci-dessous.

// ─── Placement manuel des libellés de spéciales ─────────────────────────────
//
// Décalage libre (x, y) de chaque nom par rapport au milieu de sa trace.
// Unité : cadratin (em), ≈ la hauteur du texte (~25 px au zoom du récap).
//   • x > 0 → vers la droite, x < 0 → vers la gauche
//   • y > 0 → vers le bas,    y < 0 → vers le haut
// Clé = numéros de passage fusionnés (ex. "1-5", "11-14", "15"), uniques sur
// tout le rallye. Modifier ces valeurs suffit à repositionner un nom ; aucune
// logique automatique ne vient les recaler.
const ES_LABEL_OFFSETS: Record<string, [number, number]> = {
  // ── Étape 1 ──
  "1-5": [-3.5, 3], // Campuac-Espeyrac
  "2-6": [2.5, -2.4], // Le Nayrac
  "3-7": [1, -3.2], // Espalion-Lassouts
  "4-8": [3, 0.5], // Vimenet
  // ── Étape 2 ──
  "9-12": [-1, 2.5], // Laissac
  "10-13": [0, 2], // Lévézou
  "11-14": [2.5, 2.2], // Luc-la-Primaube – Moyrazès
  "15": [0, -3.7], // Rodez Agglomération
};

const DEFAULT_ES_LABEL_OFFSET: [number, number] = [0, -1.6];

type EsLabelProps = { label: string; offset: [number, number] };

export const buildStageRecapEsLabels = (
  route: StagedRoute
): FeatureCollection<Point, EsLabelProps> => {
  const groups = new Map<
    string,
    { esNumbers: number[]; span: StagedSegmentSpan }
  >();

  for (const span of route.segments) {
    const { segment } = span;
    if (segment.type !== "ES" || span.coordinates.length < 2) continue;
    const existing = groups.get(segment.title);
    if (existing) {
      if (segment.esNumber !== undefined) {
        existing.esNumbers.push(segment.esNumber);
      }
    } else {
      groups.set(segment.title, {
        esNumbers: segment.esNumber !== undefined ? [segment.esNumber] : [],
        span,
      });
    }
  }

  const features: Feature<Point, EsLabelProps>[] = [];
  for (const [title, { esNumbers, span }] of groups) {
    const numbers = [...new Set(esNumbers)].sort((a, b) => a - b);
    const key = numbers.join("-");
    // Retour à la ligne explicite après "ES X" : le numéro de passage reste
    // au-dessus, le nom de la spéciale passe en dessous.
    const prefix = numbers.length > 0 ? `ES ${key}\n` : "";
    const midpoint = span.coordinates[Math.floor(span.coordinates.length / 2)];
    features.push({
      type: "Feature",
      properties: {
        label: `${prefix}${title}`,
        offset: ES_LABEL_OFFSETS[key] ?? DEFAULT_ES_LABEL_OFFSET,
      },
      geometry: { type: "Point", coordinates: midpoint },
    });
  }

  return { type: "FeatureCollection", features };
};

// Trace complète (ES orange / liaisons bleu) + pins ZP, en pleine opacité.
// Pas de tracker ni de tracé "progress" : le récap est une vue figée.
export const addStageRecapLayers = (
  map: mapboxgl.Map,
  route: StagedRoute
): void => {
  map.addSource(SOURCE_IDS.routeFull, {
    type: "geojson",
    data: buildAllRouteFeatures(route),
  });
  map.addSource(PUBLIC_ZONES_SOURCE_ID, {
    type: "geojson",
    data: waypointCollection(buildStageRecapPublicZones(route)),
  });
  map.addSource(ES_LABELS_SOURCE_ID, {
    type: "geojson",
    data: buildStageRecapEsLabels(route),
  });

  map.addLayer({
    id: LAYER_IDS.routeOutline,
    type: "line",
    source: SOURCE_IDS.routeFull,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": stageRecap.route.outlineColor,
      "line-opacity": stageRecap.route.outlineOpacity,
      "line-width": buildRecapLineWidth(stageRecap.route.outlineExtraWidth),
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: LAYER_IDS.routeCore,
    type: "line",
    source: SOURCE_IDS.routeFull,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": SEGMENT_COLOR_EXPRESSION,
      "line-opacity": stageRecap.route.coreOpacity,
      "line-width": buildRecapLineWidth(0),
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: LAYER_IDS.publicZones,
    type: "symbol",
    source: PUBLIC_ZONES_SOURCE_ID,
    layout: {
      "icon-image": PIN_IDS.publicZone,
      "icon-size": stageRecap.publicZone.iconSize,
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": 1,
    },
  } as mapboxgl.SymbolLayerSpecification);

  map.addLayer({
    id: LAYER_IDS.esLabels,
    type: "symbol",
    source: ES_LABELS_SOURCE_ID,
    layout: {
      "text-field": ["get", "label"],
      "text-font": mapPins.label.font,
      "text-letter-spacing": stageRecap.esLabel.letterSpacing,
      "text-max-width": stageRecap.esLabel.maxWidth,
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        stageRecap.esLabel.sizeStops.lowZoom,
        stageRecap.esLabel.sizeStops.lowSize,
        stageRecap.esLabel.sizeStops.highZoom,
        stageRecap.esLabel.sizeStops.highSize,
      ],
      // Placement manuel : chaque libellé est décalé exactement par son offset
      // (x, y) défini dans ES_LABEL_OFFSETS. allow/ignore-placement = true →
      // aucun recalage automatique, aucun masquage par collision.
      "text-anchor": "center",
      "text-offset": ["get", "offset"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": stageRecap.esLabel.color,
      "text-halo-color": stageRecap.esLabel.haloColor,
      "text-halo-width": stageRecap.esLabel.haloWidth,
      "text-halo-blur": stageRecap.esLabel.haloBlur,
    },
  } as mapboxgl.SymbolLayerSpecification);
};
