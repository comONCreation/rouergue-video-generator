import type { Feature, FeatureCollection, LineString } from "geojson";
import type mapboxgl from "mapbox-gl";
import type { LonLat } from "../gpx";
import { colors, mapRoute } from "../theme";
import type { Segment } from "../data/segments";
import {
  spanCoordinatesUntilDistance,
  type StagedRoute,
  type StagedSegmentSpan,
} from "../stagedRoute";

const buildSegmentLineFeature = (
  span: StagedSegmentSpan,
  coordinates: LonLat[]
): Feature<LineString> => ({
  type: "Feature",
  properties: {
    segmentType: span.segment.type,
    segmentId: span.segment.id,
  },
  geometry: { type: "LineString", coordinates },
});

export const buildFullRouteFeatures = (
  route: StagedRoute,
  activeSegmentIndex: number
): FeatureCollection<LineString> => ({
  type: "FeatureCollection",
  features: route.segments
    .map((span, index) => ({ span, index }))
    .filter(
      ({ span, index }) =>
        span.coordinates.length >= 2 &&
        index >= activeSegmentIndex - mapRoute.thresholds.visiblePastSegments
    )
    .map(({ span }) => buildSegmentLineFeature(span, span.coordinates)),
});

export const buildProgressFeatures = (
  route: StagedRoute,
  distance: number,
  activeSegmentIndex: number
): FeatureCollection<LineString> => ({
  type: "FeatureCollection",
  features: route.segments
    .map((span, index) => {
      if (index < activeSegmentIndex - mapRoute.thresholds.visiblePastSegments) return null;
      const coords = spanCoordinatesUntilDistance(span, distance);
      if (coords.length < 2) return null;
      return buildSegmentLineFeature(span, coords);
    })
    .filter((feature): feature is Feature<LineString> => feature !== null),
});

export const SEGMENT_COLOR_EXPRESSION: mapboxgl.ExpressionSpecification = [
  "match",
  ["get", "segmentType"],
  "ES",
  colors.orange,
  "LIAISON",
  colors.blue,
  colors.blue,
];

export const getSegmentColor = (segment: Segment) =>
  segment.type === "ES" ? colors.orange : colors.blue;
