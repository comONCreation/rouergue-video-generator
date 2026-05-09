import React from "react";
import { Composition } from "remotion";
import { SegmentOverlay } from "./SegmentOverlay";
import { SEGMENTS } from "./data/segments";
import { layout } from "./theme";

// Durée par défaut d'un overlay = 30 secondes (ajustable via CLI au render)
const DEFAULT_DURATION_SECONDS = 30;

export const Root: React.FC = () => {
  return (
    <>
      {/* Composition générique paramétrée — utile pour tester n'importe quel
          segment depuis Remotion Studio en changeant defaultProps. */}
      <Composition
        id="overlay"
        component={SegmentOverlay}
        width={layout.width}
        height={layout.height}
        fps={layout.fps}
        durationInFrames={DEFAULT_DURATION_SECONDS * layout.fps}
        defaultProps={{ segmentId: SEGMENTS[0].id }}
      />

      {/* Une composition par segment pour rendu en lot.
          ID = identifiant du segment (ex. S1-ES1). */}
      {SEGMENTS.map((segment) => (
        <Composition
          key={segment.id}
          id={segment.id}
          component={SegmentOverlay}
          width={layout.width}
          height={layout.height}
          fps={layout.fps}
          durationInFrames={DEFAULT_DURATION_SECONDS * layout.fps}
          defaultProps={{ segmentId: segment.id }}
        />
      ))}
    </>
  );
};
