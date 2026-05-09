import React from "react";
import { Composition } from "remotion";
import { SegmentMapVideo } from "./SegmentMapVideo";
import { SegmentOverlay } from "./SegmentOverlay";
import { SEGMENTS, computeSegmentDurationSeconds } from "./data/segments";
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
    </>
  );
};
