import mapboxgl from "mapbox-gl";
import { staticFile } from "remotion";
import { mapPins, mapRoute } from "../theme";

// IDs partagés entre RallyMap (vidéos par segment) et ContinuousStageMap
// (vidéo continue d'étape). À garder synchronisés avec les references
// `setGeoJsonData(map, ID, …)` côté composants.
export const SOURCE_IDS = {
  routeFull: "route-full",
  routeProgress: "route-progress",
  waypoints: "waypoints",
  tracker: "tracker",
} as const;

export const PIN_IDS = {
  start: "pin-start",
  finish: "pin-finish",
  publicZone: "pin-public-zone",
  standard: "pin-standard",
} as const;

export const loadMapImage = (
  map: mapboxgl.Map,
  imageId: string,
  imagePath: string,
  pixelRatio: number
) =>
  new Promise<void>((resolve, reject) => {
    if (map.hasImage(imageId)) {
      resolve();
      return;
    }
    map.loadImage(staticFile(imagePath), (error, image) => {
      if (error) {
        reject(error);
        return;
      }
      if (!image) {
        reject(new Error(`Image Mapbox introuvable : ${imagePath}`));
        return;
      }
      map.addImage(imageId, image, { pixelRatio });
      resolve();
    });
  });

export const loadAllPinImages = (map: mapboxgl.Map) =>
  Promise.all([
    loadMapImage(map, PIN_IDS.start, mapPins.startPath, 2),
    loadMapImage(map, PIN_IDS.finish, mapPins.finishPath, 2),
    loadMapImage(map, PIN_IDS.standard, mapPins.standardPath, 2),
    loadMapImage(map, PIN_IDS.publicZone, mapPins.publicZonePath, 2),
  ]);

export const setGeoJsonData = (
  map: mapboxgl.Map,
  sourceId: string,
  data: GeoJSON.GeoJSON
) => {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  source?.setData(data);
};

const buildLineWidthExpression = (offset: number) => {
  const { lineWidthStops } = mapRoute;
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    lineWidthStops.lowZoom,
    lineWidthStops.lowWidth + offset,
    lineWidthStops.midZoom,
    lineWidthStops.midWidth + offset,
    lineWidthStops.highZoom,
    lineWidthStops.highWidth + offset,
  ];
};

// `lineColor` accepte une couleur fixe (vidéos par segment, où la teinte
// dépend du type ES/Liaison du segment) ou une expression Mapbox `match`
// (vidéo continue, où la teinte vient d'une propriété par feature).
export type LineColor = string | mapboxgl.ExpressionSpecification;

export const addRouteAndWaypointLayers = (
  map: mapboxgl.Map,
  options: { lineColor: LineColor; trackerCoreColor: string }
) => {
  const widthExpression = buildLineWidthExpression(0);

  map.addLayer({
    id: "route-full-outline",
    type: "line",
    source: SOURCE_IDS.routeFull,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": mapRoute.outlineColor,
      "line-opacity": mapRoute.fullOutlineOpacity,
      "line-width": buildLineWidthExpression(mapRoute.fullOutlineExtraWidth),
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "route-full",
    type: "line",
    source: SOURCE_IDS.routeFull,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": options.lineColor,
      "line-opacity": mapRoute.fullRouteOpacity,
      "line-width": widthExpression,
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "route-progress-outline",
    type: "line",
    source: SOURCE_IDS.routeProgress,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": mapRoute.outlineColor,
      "line-opacity": mapRoute.progressOutlineOpacity,
      "line-width": buildLineWidthExpression(
        mapRoute.progressOutlineExtraWidth
      ),
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "route-progress",
    type: "line",
    source: SOURCE_IDS.routeProgress,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": options.lineColor,
      "line-opacity": 1,
      "line-width": widthExpression,
    },
  } as mapboxgl.LineLayerSpecification);

  map.addLayer({
    id: "tracker-halo",
    type: "circle",
    source: SOURCE_IDS.tracker,
    paint: {
      "circle-color": mapRoute.tracker.haloColor,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        mapRoute.tracker.radiusStops.lowZoom,
        mapRoute.tracker.radiusStops.haloLowRadius,
        mapRoute.tracker.radiusStops.highZoom,
        mapRoute.tracker.radiusStops.haloHighRadius,
      ],
      "circle-stroke-color": mapRoute.tracker.haloStrokeColor,
      "circle-stroke-width": mapRoute.tracker.haloStrokeWidth,
    },
  } as mapboxgl.CircleLayerSpecification);

  map.addLayer({
    id: "tracker-core",
    type: "circle",
    source: SOURCE_IDS.tracker,
    paint: {
      "circle-color": options.trackerCoreColor,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        mapRoute.tracker.radiusStops.lowZoom,
        mapRoute.tracker.radiusStops.coreLowRadius,
        mapRoute.tracker.radiusStops.highZoom,
        mapRoute.tracker.radiusStops.coreHighRadius,
      ],
      "circle-stroke-color": mapRoute.tracker.coreStrokeColor,
      "circle-stroke-width": mapRoute.tracker.coreStrokeWidth,
    },
  } as mapboxgl.CircleLayerSpecification);

  map.addLayer({
    id: "waypoints",
    type: "symbol",
    source: SOURCE_IDS.waypoints,
    layout: {
      "icon-image": [
        "match",
        ["get", "kind"],
        "start",
        PIN_IDS.start,
        "finish",
        PIN_IDS.finish,
        "public-zone",
        PIN_IDS.publicZone,
        "standard",
        PIN_IDS.standard,
        PIN_IDS.standard,
      ],
      "icon-size": [
        "match",
        ["get", "kind"],
        "public-zone",
        mapPins.iconSize.publicZone,
        "standard",
        mapPins.iconSize.standard,
        mapPins.iconSize.startFinish,
      ],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "text-field": ["get", "label"],
      "text-font": mapPins.label.font,
      "text-letter-spacing": mapPins.label.letterSpacing,
      "text-max-width": mapPins.label.maxWidth,
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        mapPins.label.lowZoom,
        mapPins.label.lowSize,
        mapPins.label.highZoom,
        mapPins.label.highSize,
      ],
      "text-offset": [mapPins.label.textOffset.x, mapPins.label.textOffset.y],
      "text-anchor": "top",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": mapPins.label.color,
      "text-halo-color": mapPins.label.haloColor,
      "text-halo-width": mapPins.label.haloWidth,
      "text-halo-blur": mapPins.label.haloBlur,
    },
  } as mapboxgl.SymbolLayerSpecification);
};
