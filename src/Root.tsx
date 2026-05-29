import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import {
  FullRallyConcat,
  type FullRallyConcatProps,
} from "./compositions/FullRallyConcat";
import { FullStageVideo } from "./compositions/FullRallyVideo";
import { SEGMENTS } from "./data/segments";
import { loadStagedRoute } from "./route/stagedRoute";
import { buildStageTimeline } from "./route/stageTimeline";
import { getStageRecapDurationInFrames } from "./route/stageRecap";
import { RALLY, STAGE_NUMBERS } from "./rally.config";
import { layout, stageIntro } from "./theme";

type FullStageProps = {
  stage: number;
};

const concatTransitionFrames = Math.round(1.2 * layout.fps);

const getFullStageDurationInFrames = async (stage: number) => {
  const segments = SEGMENTS.filter((segment) => segment.stage === stage);
  const route = await loadStagedRoute(segments);
  const timeline = buildStageTimeline(route);
  const plaqueFrames =
    RALLY.introPlaqueStage === stage
      ? Math.round(stageIntro.plaque.durationSeconds * layout.fps)
      : 0;
  const recapFrames = getStageRecapDurationInFrames(stage);

  return (
    Math.ceil(timeline.totalSeconds * layout.fps) + plaqueFrames + recapFrames
  );
};

const calculateFullStageMetadata = async ({
  props,
}: {
  props: FullStageProps;
}) => {
  return {
    durationInFrames: await getFullStageDurationInFrames(props.stage),
  };
};

const calculateFullRallyMetadata: CalculateMetadataFunction<
  FullRallyConcatProps
> = async () => {
  const stages = await Promise.all(
    STAGE_NUMBERS.map(async (stage) => ({
      stage,
      durationInFrames: await getFullStageDurationInFrames(stage),
    }))
  );

  return {
    durationInFrames: stages.reduce(
      (total, stage) => total + stage.durationInFrames,
      0
    ),
    props: {
      stages,
      transitionFrames: concatTransitionFrames,
    },
  };
};

export const Root: React.FC = () => (
  <>
    {STAGE_NUMBERS.map((stage) => (
      <Composition
        key={stage}
        id={`FULL-S${stage}`}
        component={FullStageVideo}
        width={layout.width}
        height={layout.height}
        fps={layout.fps}
        calculateMetadata={calculateFullStageMetadata}
        defaultProps={{ stage }}
      />
    ))}
    <Composition
      id="FULL-ROUERGUE"
      component={FullRallyConcat}
      width={layout.width}
      height={layout.height}
      fps={layout.fps}
      calculateMetadata={calculateFullRallyMetadata}
      defaultProps={{
        stages: [],
        transitionFrames: concatTransitionFrames,
      }}
    />
  </>
);
