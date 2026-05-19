import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, stageIntro } from "../theme";

export const PlaqueBug: React.FC<{
  opacity?: number;
}> = ({ opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      top: stageIntro.plaque.bugTop,
      right: stageIntro.plaque.bugRight,
      width: stageIntro.plaque.bugWidth,
      opacity,
      filter: `drop-shadow(${stageIntro.plaque.bugShadow})`,
      pointerEvents: "none",
      zIndex: 10,
    }}
  >
    <Img
      src={staticFile("plaque.png")}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
      }}
    />
  </div>
);

export const PlaqueIntro: React.FC<{
  durationFrames: number;
}> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterFrames = Math.round(stageIntro.plaque.enterSeconds * fps);
  const exitFrames = Math.round(stageIntro.plaque.exitSeconds * fps);
  const exitStart = Math.max(0, durationFrames - exitFrames);
  const enter = interpolate(frame, [0, enterFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [exitStart, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(
    frame,
    [0, durationFrames],
    [stageIntro.plaque.startScale, stageIntro.plaque.endScale],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: enter * exit,
      }}
    >
      <div
        style={{
          width: stageIntro.plaque.introWidth,
          transform: `scale(${scale})`,
          filter: `drop-shadow(${stageIntro.plaque.introShadow} ${colors.shadow})`,
        }}
      >
        <Img
          src={staticFile("plaque.png")}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const PlaqueIntroBackdrop: React.FC<{
  durationFrames: number;
}> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exitFrames = Math.round(stageIntro.backdrop.exitSeconds * fps);
  const exitStart = Math.max(0, durationFrames - exitFrames);
  const opacity = interpolate(frame, [exitStart, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        backdropFilter: `blur(${stageIntro.backdrop.blurPx}px)`,
        background: stageIntro.backdrop.background,
      }}
    />
  );
};
