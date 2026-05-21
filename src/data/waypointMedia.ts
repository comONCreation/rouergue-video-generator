import type { Segment } from "./segments";
import { isShakedownStage } from "../rally.config";
import { colors, mapCamera } from "../theme";

export type WaypointMediaAsset = {
  type: "image" | "video";
  src: string;
};

export type WaypointMediaCue = {
  id: string;
  title: string;
  matchLabels: string[];
  media?: WaypointMediaAsset;
  holdSeconds: number;
  accentColor: string;
};

export type WaypointMediaMatch = {
  label: string;
  segment: Segment;
  type: string;
};

export type WaypointMediaEntry = {
  index: number;
  cue: WaypointMediaCue;
};

const normalizeLabel = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const WAYPOINT_MEDIA_HOLD_SECONDS =
  mapCamera.stageVideo.keyPointHoldSeconds.media;

export const WAYPOINT_MEDIA_CUES: WaypointMediaCue[] = [
  {
    id: "podium-parc-ferme-bourran",
    title: "Podium parc fermé Bourran",
    matchLabels: ["Podium parc ferme Bourran", "Podium Bourran"],
    holdSeconds: WAYPOINT_MEDIA_HOLD_SECONDS,
    accentColor: colors.blue,
  },
  {
    id: "parc-ferme-bourran",
    title: "Parc fermé Bourran",
    matchLabels: ["Parc ferme Bourran"],
    holdSeconds: WAYPOINT_MEDIA_HOLD_SECONDS,
    accentColor: colors.blue,
  },
  {
    id: "assistance-laissac",
    title: "Assistance Laissac",
    matchLabels: ["Assistance Laissac"],
    media: { type: "video", src: "videos/laissac.mp4" },
    holdSeconds: WAYPOINT_MEDIA_HOLD_SECONDS,
    accentColor: colors.blue,
  },
  {
    id: "regroupement-espalion",
    title: "Regroupement Espalion",
    matchLabels: ["Regroupement Espalion"],
    holdSeconds: WAYPOINT_MEDIA_HOLD_SECONDS,
    accentColor: colors.blue,
  },
  {
    id: "regroupement-la-primaube",
    title: "Regroupement La Primaube",
    matchLabels: ["Regroupement La Primaube"],
    holdSeconds: WAYPOINT_MEDIA_HOLD_SECONDS,
    accentColor: colors.blue,
  },
];

export const matchesWaypointMediaCue = (
  cue: WaypointMediaCue,
  label: string
): boolean => {
  const normalizedLabel = normalizeLabel(label);
  return cue.matchLabels.some((matchLabel) => {
    const normalizedMatch = normalizeLabel(matchLabel);
    return (
      normalizedLabel === normalizedMatch ||
      normalizedLabel.includes(normalizedMatch)
    );
  });
};

export const getWaypointMediaCue = (
  match: WaypointMediaMatch
): WaypointMediaCue | null =>
  WAYPOINT_MEDIA_CUES.find((cue) =>
    matchesWaypointMediaCue(cue, match.label)
  ) ?? null;

export const buildFirstWaypointMediaEntries = <
  T extends WaypointMediaMatch,
>(
  keyPoints: T[]
): WaypointMediaEntry[] => {
  // Cas particulier shakedown : pas de média sur les waypoints.
  if (keyPoints.some((kp) => isShakedownStage(kp.segment.stage))) return [];

  const seenCueIds = new Set<string>();
  const entries: WaypointMediaEntry[] = [];

  keyPoints.forEach((keyPoint, index) => {
    const cue = getWaypointMediaCue(keyPoint);
    if (!cue || seenCueIds.has(cue.id)) return;
    seenCueIds.add(cue.id);
    entries.push({ index, cue });
  });

  return entries;
};
