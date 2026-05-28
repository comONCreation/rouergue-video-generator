import type { Segment } from "./segments";
import { isShakedownStage } from "../rally.config";

export type AudioCue = {
  id: string;
  src: string;
  durationSeconds: number;
  duckBackground: boolean;
  duckedBackgroundVolume: number;
  duckReleaseBeforeEndSeconds: number;
  volume: number;
};

export type KeyPointAudioMatch = {
  type: string;
  label: string;
  segment: Segment;
};

export const audioMix = {
  backgroundSrc: "audio/music.mp3",
  backgroundVolume: 0.8,
  duckedBackgroundVolume: 0.3,
  startEsDuckedBackgroundVolume: 0.1,
  startEsDuckReleaseBeforeEndSeconds: 4,
  duckFadeSeconds: 0.4,
  voiceVolume: 1,
} as const;

const AUDIO_DURATION_SECONDS: Record<string, number> = {
  "audio/arrivee-es-1.mp3": 3.97,
  "audio/arrivee-es-2.mp3": 2.43,
  "audio/arrivee-es-3.mp3": 3.63,
  "audio/arrivee-es-4.mp3": 2.51,
  "audio/arrivee-es-5.mp3": 3.79,
  "audio/arrivee-es-6.mp3": 2.51,
  "audio/arrivee-es-7.mp3": 3.63,
  "audio/arrivee-es-8.mp3": 2.85,
  "audio/arrivee-es-9.mp3": 2.51,
  "audio/arrivee-es-10.mp3": 2.93,
  "audio/arrivee-es-11.mp3": 4.36,
  "audio/arrivee-es-12.mp3": 2.69,
  "audio/arrivee-es-13.mp3": 3.16,
  "audio/arrivee-es-14.mp3": 4.99,
  "audio/arrivee-es-15.mp3": 3.71,
  "audio/arrivee-shakedown.mp3": 1.72,
  "audio/assistance-laissac.mp3": 2.27,
  "audio/depart-es-1.mp3": 4.13,
  "audio/depart-es-2.mp3": 2.43,
  "audio/depart-es-3.mp3": 2.77,
  "audio/depart-es-4.mp3": 2.35,
  "audio/depart-es-5.mp3": 3.24,
  "audio/depart-es-6.mp3": 2.19,
  "audio/depart-es-7.mp3": 2.85,
  "audio/depart-es-8.mp3": 2.43,
  "audio/depart-es-9.mp3": 2.19,
  "audio/depart-es-10.mp3": 2.51,
  "audio/depart-es-11.mp3": 4.28,
  "audio/depart-es-12.mp3": 2.35,
  "audio/depart-es-13.mp3": 2.19,
  "audio/depart-es-14.mp3": 5.49,
  "audio/depart-es-15.mp3": 3.16,
  "audio/depart-shakedown.mp3": 1.65,
  "audio/intro-etape-1.mp3": 5.07,
  "audio/intro-etape-2.mp3": 5.25,
  "audio/intro-shakedown.mp3": 5.41,
  "audio/parc-de-repositionnement.mp3": 3.55,
  "audio/parc-ferme-bourran.mp3": 1.15,
  "audio/reco-es-15.mp3": 3.79,
  "audio/regroupement-espalion.mp3": 1.65,
  "audio/regroupement-la-primaube.mp3": 2.27,
  "audio/start-es.mp3": 9.22,
};

const audioSrc = (fileId: string) => `audio/${fileId}.mp3`;

const cue = (fileId: string): AudioCue => {
  const src = audioSrc(fileId);
  return {
    id: fileId,
    src,
    durationSeconds: AUDIO_DURATION_SECONDS[src] ?? 4,
    duckBackground: true,
    duckedBackgroundVolume: audioMix.duckedBackgroundVolume,
    duckReleaseBeforeEndSeconds: 0,
    volume: audioMix.voiceVolume,
  };
};

const normalizeLabel = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const extractEsNumber = (value: string | undefined): number | null => {
  if (!value) return null;
  const match = normalizeLabel(value).match(/\bes\s+(\d{1,2})\b/);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) ? number : null;
};

const getContextualEsNumber = ({
  type,
  label,
  segment,
}: KeyPointAudioMatch): number | null => {
  if (segment.esNumber) return segment.esNumber;

  const contextualLabels =
    type === "es-start"
      ? [segment.toLocation, segment.fromLocation, label]
      : [segment.fromLocation, segment.toLocation, label];

  for (const contextualLabel of contextualLabels) {
    const esNumber = extractEsNumber(contextualLabel);
    if (esNumber) return esNumber;
  }

  return null;
};

const getNamedWaypointAudioId = (label: string): string | null => {
  const normalized = normalizeLabel(label);

  if (normalized.includes("parc de repositionnement")) {
    return "parc-de-repositionnement";
  }
  if (normalized.includes("assistance laissac")) {
    return "assistance-laissac";
  }
  if (normalized.includes("regroupement espalion")) {
    return "regroupement-espalion";
  }
  if (normalized.includes("regroupement la primaube")) {
    return "regroupement-la-primaube";
  }
  if (
    normalized.includes("parc ferme bourran") &&
    !normalized.includes("podium")
  ) {
    return "parc-ferme-bourran";
  }

  return null;
};

export const getStageIntroAudioCue = (stage: number): AudioCue | null => {
  if (isShakedownStage(stage)) return cue("intro-shakedown");
  if (stage === 1) return cue("intro-etape-1");
  if (stage === 2) return cue("intro-etape-2");
  return null;
};

export const getSpecialStartAudioCue = (): AudioCue => ({
  ...cue("start-es"),
  duckedBackgroundVolume: audioMix.startEsDuckedBackgroundVolume,
  duckReleaseBeforeEndSeconds: audioMix.startEsDuckReleaseBeforeEndSeconds,
});

export const getKeyPointAudioCue = (
  match: KeyPointAudioMatch
): AudioCue | null => {
  const normalizedLabel = normalizeLabel(match.label);

  if (
    (isShakedownStage(match.segment.stage) ||
      normalizedLabel.includes("shakedown")) &&
    match.type === "es-start"
  ) {
    return cue("depart-shakedown");
  }

  if (
    (isShakedownStage(match.segment.stage) ||
      normalizedLabel.includes("shakedown")) &&
    match.type === "es-finish"
  ) {
    return cue("arrivee-shakedown");
  }

  if (normalizedLabel.includes("depart reco es 15")) {
    return cue("reco-es-15");
  }

  if (normalizedLabel.includes("reco")) {
    return null;
  }

  const namedWaypointAudioId = getNamedWaypointAudioId(match.label);
  if (namedWaypointAudioId) {
    return cue(namedWaypointAudioId);
  }

  if (match.type !== "es-start" && match.type !== "es-finish") {
    return null;
  }

  const esNumber = getContextualEsNumber(match);
  if (!esNumber) return null;

  const keyPointCue = cue(
    `${match.type === "es-start" ? "depart" : "arrivee"}-es-${esNumber}`
  );

  return keyPointCue;
};
