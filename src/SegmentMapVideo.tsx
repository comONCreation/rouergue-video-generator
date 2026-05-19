import React from "react";
import { AbsoluteFill } from "remotion";
import { RallyMap } from "./components/RallyMap";
import { getGpxPathForSegment } from "./data/gpxFiles";
import { getSegmentById } from "./data/segments";
import { SegmentOverlay } from "./SegmentOverlay";
import { PlaqueBug } from "./components/Plaque";

export type SegmentMapVideoProps = {
  segmentId: string;
};

const MissingSegment: React.FC<{ segmentId: string }> = ({ segmentId }) => (
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

const MissingGpx: React.FC<{ segmentId: string }> = ({ segmentId }) => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(135deg, #07111f 0%, #0f335a 100%)",
      color: "white",
      fontFamily: "Montserrat",
      fontSize: 42,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    GPX introuvable pour {segmentId}
  </AbsoluteFill>
);

export const SegmentMapVideo: React.FC<SegmentMapVideoProps> = ({
  segmentId,
}) => {
  const segment = getSegmentById(segmentId);

  if (!segment) {
    return <MissingSegment segmentId={segmentId} />;
  }

  const gpxPath = getGpxPathForSegment(segment);

  return (
    <AbsoluteFill style={{ backgroundColor: "#07111f" }}>
      {gpxPath ? (
        <RallyMap segment={segment} gpxPath={gpxPath} />
      ) : (
        <MissingGpx segmentId={segment.id} />
      )}
      <SegmentOverlay segmentId={segment.id} />
      <PlaqueBug />
    </AbsoluteFill>
  );
};
