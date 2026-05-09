import React from "react";
import { Composition } from "remotion";
import { SegmentMapVideo } from "./SegmentMapVideo";
import { SegmentOverlay } from "./SegmentOverlay";
import { FullStageVideo } from "./FullRallyVideo";
import {
  SEGMENTS,
  computeSegmentDurationSeconds,
  computeStageContinuousDurationSeconds,
} from "./data/segments";
import { layout } from "./theme";

export const Root: React.FC = () => {
  // Une composition par segment pour rendu en lot.
  // ID = identifiant du segment (ex. S1-ES1).
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
      {SEGMENTS.map((segment) => {
        const durationInFrames = Math.round(
          computeSegmentDurationSeconds(segment) * layout.fps
        );
        return (
          <Composition
            key={`overlay-${segment.id}`}
            id={`OVERLAY-${segment.id}`}
            component={SegmentOverlay}
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
        durationInFrames={Math.round(
          computeStageContinuousDurationSeconds(1) * layout.fps
        )}
        defaultProps={{ stage: 1 as const }}
      />
      <Composition
        id="FULL-S2"
        component={FullStageVideo}
        width={layout.width}
        height={layout.height}
        fps={layout.fps}
        durationInFrames={Math.round(
          computeStageContinuousDurationSeconds(2) * layout.fps
        )}
        defaultProps={{ stage: 2 as const }}
      />
    </>
  );
};
