import React from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { LeftPanel, useHideProgress } from "../components/LeftPanel";
import { CompactPanel } from "../components/CompactPanel";
import { getSegmentById } from "../data/segments";

const { waitUntilDone } = loadFont("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export type SegmentOverlayProps = {
  segmentId: string;
};

const fontHandle = delayRender("Loading Montserrat");
waitUntilDone()
  .then(() => continueRender(fontHandle))
  .catch((err) => {
    console.error("Font load failed", err);
    continueRender(fontHandle);
  });

export const SegmentOverlay: React.FC<SegmentOverlayProps> = ({
  segmentId,
}) => {
  const segment = getSegmentById(segmentId);
  const hide = useHideProgress();

  if (!segment) {
    return (
      <AbsoluteFill
        style={{
          background: "rgba(255, 0, 0, 0.5)",
          color: "white",
          fontFamily: "Montserrat",
          fontSize: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Segment introuvable : {segmentId}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <LeftPanel segment={segment} hide={hide} />
      <CompactPanel segment={segment} visibility={hide} />
    </AbsoluteFill>
  );
};
