import React from "react";
import { Composition } from "remotion";
import { SegmentMapVideo } from "./SegmentMapVideo";
import { FullStageVideo } from "./FullRallyVideo";
import {
  SEGMENTS,
  computeSegmentDurationSeconds,
} from "./data/segments";
import { loadStagedRoute } from "./stagedRoute";
import { buildStageTimeline } from "./stageTimeline";
import { layout } from "./theme";

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
    durationInFrames: Math.ceil(timeline.totalSeconds * layout.fps),
  };
};

export const Root: React.FC = () => {
  return (
    <>
      {SEGMENTS.map((segment) => {
        const durationInFrames = Math.round(
          computeSegmentDurationSeconds(segment) * layout.fps
        );
        return (
          <Composition
            key={segment.id}
            id={segment.id}
            component={SegmentMapVideo}
            width={layout.width}
            height={layout.height}
            fps={layout.fps}
            durationInFrames={durationInFrames}
            defaultProps={{ segmentId: segment.id }}
          />
        );
      })}
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
