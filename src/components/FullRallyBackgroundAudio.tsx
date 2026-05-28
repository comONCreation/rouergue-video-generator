import React, { useEffect, useMemo, useState } from "react";
import {
  continueRender,
  delayRender,
  useVideoConfig,
} from "remotion";
import { SEGMENTS } from "../data/segments";
import { RALLY } from "../rally.config";
import { buildStageTimeline } from "../route/stageTimeline";
import { loadStagedRoute } from "../route/stagedRoute";
import { mapCamera, stageIntro } from "../theme";
import {
  BackgroundMusicAudio,
  buildScheduledAudioCues,
  type ScheduledAudioCue,
} from "./StageAudio";

export type FullRallyAudioStage = {
  stage: number;
  fromFrame: number;
};

type FullRallyBackgroundAudioProps = {
  stages: FullRallyAudioStage[];
};

const getPlaqueIntroFrames = (stage: number, fps: number): number =>
  RALLY.introPlaqueStage === stage
    ? Math.round(stageIntro.plaque.durationSeconds * fps)
    : 0;

export const FullRallyBackgroundAudio: React.FC<
  FullRallyBackgroundAudioProps
> = ({ stages }) => {
  const { fps } = useVideoConfig();
  const [scheduledCues, setScheduledCues] =
    useState<ScheduledAudioCue[] | null>(null);
  const stagesKey = useMemo(
    () => stages.map((stage) => `${stage.stage}:${stage.fromFrame}`).join("|"),
    [stages]
  );

  useEffect(() => {
    if (stages.length === 0) {
      setScheduledCues([]);
      return;
    }

    const handle = delayRender("Chargement audio FULL-ROUERGUE", {
      timeoutInMilliseconds: mapCamera.renderTimeouts.loadMapMs,
    });
    let cancelled = false;
    let completed = false;

    const complete = () => {
      if (completed) return;
      completed = true;
      continueRender(handle);
    };

    const load = async () => {
      try {
        const cuesByStage = await Promise.all(
          stages.map(async (stageEntry) => {
            const segments = SEGMENTS.filter(
              (segment) => segment.stage === stageEntry.stage
            );
            const route = await loadStagedRoute(segments);
            const timeline = buildStageTimeline(route);
            const localCues = buildScheduledAudioCues({
              fps,
              stage: stageEntry.stage,
              startDelayFrames: getPlaqueIntroFrames(stageEntry.stage, fps),
              timeline,
              route,
            });

            return localCues.map((cue) => ({
              ...cue,
              key: `stage-${stageEntry.stage}-${cue.key}`,
              fromFrame: stageEntry.fromFrame + cue.fromFrame,
            }));
          })
        );

        if (!cancelled) {
          setScheduledCues(
            cuesByStage.flat().sort((a, b) => a.fromFrame - b.fromFrame)
          );
        }
      } catch (err) {
        console.error("Audio FULL-ROUERGUE load failed", err);
        if (!cancelled) setScheduledCues([]);
      } finally {
        if (!cancelled) complete();
      }
    };

    load();

    return () => {
      cancelled = true;
      complete();
    };
  }, [fps, stagesKey]);

  if (!scheduledCues) return null;

  return (
    <BackgroundMusicAudio
      scheduledCues={scheduledCues}
      name="Musique de fond FULL-ROUERGUE"
    />
  );
};
