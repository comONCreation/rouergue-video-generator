import React, { useCallback, useMemo } from "react";
import { Html5Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import {
  audioMix,
  getKeyPointAudioCue,
  getSpecialStartAudioCue,
  getStageIntroAudioCue,
  type AudioCue,
} from "../data/audioCues";
import {
  getDistanceAtTime,
  getStageIntroCardSeconds,
  type StageTimeline,
} from "../route/stageTimeline";
import { distanceMeters, type LonLat } from "../route/gpx";
import type { StagedRoute, StagedSegmentSpan } from "../route/stagedRoute";

type StageAudioProps = {
  stage: number;
  route: StagedRoute;
  timeline: StageTimeline;
  includeBackgroundAudio?: boolean;
  startDelayFrames?: number;
};

export type ScheduledAudioCue = AudioCue & {
  key: string;
  fromFrame: number;
  durationFrames: number;
};

const KEYPOINT_DISTANCE_TOLERANCE_METERS = 150;
const AUDIO_DEDUPE_TOLERANCE_SECONDS = 0.75;

const durationFramesForCue = (cue: AudioCue, fps: number): number =>
  Math.max(1, Math.ceil(cue.durationSeconds * fps) + 2);

const getKeyPointAudioStartSeconds = (
  timeline: StageTimeline,
  keyPointIndex: number,
  phaseStartTime: number
): number => {
  const keyPoint = timeline.keyPoints[keyPointIndex];
  if (keyPoint?.type !== "stage-start") return phaseStartTime;

  return phaseStartTime + getStageIntroCardSeconds(timeline);
};

const isStageStartDistance = (
  timeline: StageTimeline,
  distance: number
): boolean =>
  timeline.keyPoints.some(
    (keyPoint) =>
      keyPoint.type === "stage-start" &&
      Math.abs(keyPoint.distance - distance) <=
        KEYPOINT_DISTANCE_TOLERANCE_METERS
  );

const hasScheduledCueCollision = (
  scheduledCues: ScheduledAudioCue[],
  cue: AudioCue,
  fromFrame: number,
  fps: number
): boolean => {
  const toleranceFrames = Math.round(AUDIO_DEDUPE_TOLERANCE_SECONDS * fps);
  return scheduledCues.some(
    (scheduledCue) =>
      scheduledCue.id === cue.id &&
      Math.abs(scheduledCue.fromFrame - fromFrame) <= toleranceFrames
  );
};

const findDistanceForCoordinateInSpan = (
  route: StagedRoute,
  span: StagedSegmentSpan,
  coordinate: LonLat
): number | null => {
  let bestDist = Infinity;
  let bestIndex = -1;
  for (let i = span.startIndex; i <= span.endIndex; i++) {
    const d = distanceMeters(route.coordinates[i], coordinate);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) return null;
  return route.cumulativeDistances[bestIndex];
};

const getTimeAtDistance = (
  timeline: StageTimeline,
  targetDistance: number
): number => {
  let low = 0;
  let high = timeline.totalSeconds;

  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (getDistanceAtTime(timeline, mid) < targetDistance) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
};

export const buildScheduledAudioCues = ({
  fps,
  stage,
  startDelayFrames,
  timeline,
  route,
}: {
  fps: number;
  stage: number;
  startDelayFrames: number;
  timeline: StageTimeline;
  route: StagedRoute;
}): ScheduledAudioCue[] => {
  const scheduledCues: ScheduledAudioCue[] = [];
  const introCue = getStageIntroAudioCue(stage);

  if (introCue) {
    scheduledCues.push({
      ...introCue,
      key: `stage-intro-${stage}`,
      fromFrame: startDelayFrames,
      durationFrames: durationFramesForCue(introCue, fps),
    });
  }

  timeline.phases.forEach((phase) => {
    if (phase.kind !== "hold") return;

    const keyPoint = timeline.keyPoints[phase.keyPointIndex];
    if (!keyPoint) return;

    const cue = getKeyPointAudioCue(keyPoint);
    if (!cue) return;
    const audioStartSeconds = getKeyPointAudioStartSeconds(
      timeline,
      phase.keyPointIndex,
      phase.startTime
    );
    const fromFrame = startDelayFrames + Math.round(audioStartSeconds * fps);

    scheduledCues.push({
      ...cue,
      key: `keypoint-${phase.keyPointIndex}-${cue.id}`,
      fromFrame,
      durationFrames: durationFramesForCue(cue, fps),
    });

    if (keyPoint.type === "es-start") {
      const specialStartCue = getSpecialStartAudioCue();
      scheduledCues.push({
        ...specialStartCue,
        key: `keypoint-${phase.keyPointIndex}-${specialStartCue.id}`,
        fromFrame,
        durationFrames: durationFramesForCue(specialStartCue, fps),
      });
    }
  });

  route.segmentRoutes.forEach(({ segment, route: parsed }, segmentIndex) => {
    const span = route.segments[segmentIndex];
    if (!span) return;

    parsed.waypoints.forEach((waypoint) => {
      if (waypoint.kind !== "standard") return;

      const cue = getKeyPointAudioCue({
        type: "waypoint",
        label: waypoint.name,
        segment,
      });
      if (!cue) return;

      const distance = findDistanceForCoordinateInSpan(
        route,
        span,
        waypoint.coordinates
      );
      if (distance === null) return;
      if (isStageStartDistance(timeline, distance)) return;

      const fromFrame =
        startDelayFrames +
        Math.round(getTimeAtDistance(timeline, distance) * fps);
      if (hasScheduledCueCollision(scheduledCues, cue, fromFrame, fps)) return;

      scheduledCues.push({
        ...cue,
        key: `route-waypoint-${segment.id}-${cue.id}`,
        fromFrame,
        durationFrames: durationFramesForCue(cue, fps),
      });
    });
  });

  return scheduledCues.sort((a, b) => a.fromFrame - b.fromFrame);
};

const smoothStep = (value: number): number =>
  value * value * (3 - 2 * value);

const getDuckAmountForFrame = (
  frame: number,
  cue: ScheduledAudioCue,
  fadeFrames: number,
  fps: number
): number => {
  const fullStart = cue.fromFrame;
  const releaseBeforeEndFrames = Math.round(
    cue.duckReleaseBeforeEndSeconds * fps
  );
  const fullEnd = Math.max(
    fullStart,
    cue.fromFrame + cue.durationFrames - releaseBeforeEndFrames
  );
  const fadeStart = fullStart - fadeFrames;
  const fadeEnd = fullEnd + fadeFrames;

  if (frame < fadeStart || frame > fadeEnd) return 0;
  if (frame >= fullStart && frame <= fullEnd) return 1;
  if (frame < fullStart) {
    return smoothStep((frame - fadeStart) / Math.max(1, fadeFrames));
  }
  return smoothStep((fadeEnd - frame) / Math.max(1, fadeFrames));
};

export const getBackgroundMusicVolume = (
  frame: number,
  scheduledCues: ScheduledAudioCue[],
  fps: number
): number => {
  const fadeFrames = Math.max(1, Math.round(audioMix.duckFadeSeconds * fps));
  return scheduledCues.reduce<number>(
    (volume, cue) => {
      if (!cue.duckBackground) return volume;
      const duckAmount = getDuckAmountForFrame(frame, cue, fadeFrames, fps);
      const cueVolume =
        audioMix.backgroundVolume +
        (cue.duckedBackgroundVolume - audioMix.backgroundVolume) * duckAmount;
      return Math.min(volume, cueVolume);
    },
    audioMix.backgroundVolume
  );
};

export const BackgroundMusicAudio: React.FC<{
  scheduledCues: ScheduledAudioCue[];
  name?: string;
}> = ({ scheduledCues, name = "Musique de fond" }) => {
  const { fps } = useVideoConfig();
  const backgroundVolume = useCallback(
    (frame: number) => getBackgroundMusicVolume(frame, scheduledCues, fps),
    [fps, scheduledCues]
  );

  return (
    <Html5Audio
      src={staticFile(audioMix.backgroundSrc)}
      loop
      loopVolumeCurveBehavior="extend"
      volume={backgroundVolume}
      name={name}
    />
  );
};

export const StageAudio: React.FC<StageAudioProps> = ({
  stage,
  route,
  timeline,
  includeBackgroundAudio = true,
  startDelayFrames = 0,
}) => {
  const { fps } = useVideoConfig();
  const scheduledCues = useMemo(
    () =>
      buildScheduledAudioCues({
        fps,
        stage,
        startDelayFrames,
        timeline,
        route,
      }),
    [fps, stage, startDelayFrames, timeline, route]
  );

  return (
    <>
      {includeBackgroundAudio && (
        <BackgroundMusicAudio scheduledCues={scheduledCues} />
      )}
      {scheduledCues.map((cue) => (
        <Sequence
          key={cue.key}
          from={cue.fromFrame}
          durationInFrames={cue.durationFrames}
          layout="none"
        >
          <Html5Audio
            src={staticFile(cue.src)}
            volume={cue.volume}
            name={cue.id}
          />
        </Sequence>
      ))}
    </>
  );
};
