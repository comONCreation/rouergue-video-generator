import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { colors } from "../theme";
import { FullStageVideo } from "./FullRallyVideo";

export type FullStageRenderPlan = {
  stage: number;
  durationInFrames: number;
};

export type FullRallyConcatProps = {
  stages: FullStageRenderPlan[];
  transitionFrames: number;
};

const BlackTransition: React.FC<{ durationFrames: number }> = ({
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const half = Math.max(1, Math.floor(durationFrames / 2));
  const opacity = interpolate(
    frame,
    [0, half, durationFrames],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return <AbsoluteFill style={{ backgroundColor: "#000000", opacity }} />;
};

export const FullRallyConcat: React.FC<FullRallyConcatProps> = ({
  stages,
  transitionFrames,
}) => {
  let cursor = 0;
  const stageEntries = stages.map((stage) => {
    const fromFrame = cursor;
    cursor += stage.durationInFrames;
    return { ...stage, fromFrame };
  });

  const transitionHalf = Math.max(1, Math.floor(transitionFrames / 2));

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {stageEntries.map((entry) => (
        <Sequence
          key={`stage-${entry.stage}`}
          from={entry.fromFrame}
          durationInFrames={entry.durationInFrames}
          layout="none"
        >
          <FullStageVideo
            stage={entry.stage}
            renderDurationInFrames={entry.durationInFrames}
          />
        </Sequence>
      ))}
      {stageEntries.slice(0, -1).map((entry) => (
        <Sequence
          key={`transition-after-${entry.stage}`}
          from={entry.fromFrame + entry.durationInFrames - transitionHalf}
          durationInFrames={transitionFrames}
          layout="none"
        >
          <BlackTransition durationFrames={transitionFrames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
