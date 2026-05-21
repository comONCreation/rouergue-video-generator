import React from "react";
import { Composition } from "remotion";
import { FullStageVideo } from "./compositions/FullRallyVideo";
import { SEGMENTS } from "./data/segments";
import { loadStagedRoute } from "./route/stagedRoute";
import { buildStageTimeline } from "./route/stageTimeline";
import { RALLY, STAGE_NUMBERS } from "./rally.config";
import { layout, stageIntro } from "./theme";

type FullStageProps = {
  stage: number;
};

const calculateFullStageMetadata = async ({
  props,
}: {
  props: FullStageProps;
}) => {
  const segments = SEGMENTS.filter((segment) => segment.stage === props.stage);
  const route = await loadStagedRoute(segments);
  const timeline = buildStageTimeline(route);
  const plaqueFrames =
    RALLY.introPlaqueStage === props.stage
      ? Math.round(stageIntro.plaque.durationSeconds * layout.fps)
      : 0;

  return {
    durationInFrames:
      Math.ceil(timeline.totalSeconds * layout.fps) + plaqueFrames,
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
  </>
);
