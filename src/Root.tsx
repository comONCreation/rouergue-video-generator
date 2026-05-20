import React from "react";
import { Composition } from "remotion";
import { FullStageVideo } from "./FullRallyVideo";
import { SEGMENTS } from "./data/segments";
import { loadStagedRoute } from "./stagedRoute";
import { buildStageTimeline } from "./stageTimeline";
import { layout, stageIntro } from "./theme";

type FullStageProps = {
  stage: 1 | 2;
};

const calculateFullStageMetadata = async ({
  props,
}: {
  props: FullStageProps;
}) => {
  const segments = SEGMENTS.filter((segment) => segment.stage === props.stage);
  const route = await loadStagedRoute(segments);
  const timeline = buildStageTimeline(route);

  return {
    durationInFrames:
      Math.ceil(timeline.totalSeconds * layout.fps) +
      (props.stage === 1
        ? Math.round(stageIntro.plaque.durationSeconds * layout.fps)
        : 0),
  };
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="FULL-S1"
        component={FullStageVideo}
        width={layout.width}
        height={layout.height}
        fps={layout.fps}
        calculateMetadata={calculateFullStageMetadata}
        defaultProps={{ stage: 1 as const }}
      />
      <Composition
        id="FULL-S2"
        component={FullStageVideo}
        width={layout.width}
        height={layout.height}
        fps={layout.fps}
        calculateMetadata={calculateFullStageMetadata}
        defaultProps={{ stage: 2 as const }}
      />
    </>
  );
};
