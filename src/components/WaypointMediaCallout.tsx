import React from "react";
import {
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
} from "remotion";
import { colors, fonts, layout } from "../theme";
import type { WaypointMediaCue } from "../data/waypointMedia";

type Point = {
  x: number;
  y: number;
};

type WaypointMediaCalloutProps = {
  cue: WaypointMediaCue;
  point: Point;
  progress: number;
  mediaStartFrame?: number;
};

const CARD_WIDTH = 600;
const CARD_HEIGHT = 400;
const TITLE_BAR_HEIGHT = 86;
const MEDIA_HEIGHT = CARD_HEIGHT - TITLE_BAR_HEIGHT;
const CARD_GAP = 58;
const CARD_OFFSET_Y = 50;
const SCREEN_MARGIN = 0;
const LEFT_SAFE_MARGIN = layout.panelWidth + 36;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value: number) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

const resolveCardPosition = (point: Point) => {
  const rightCandidate = point.x + CARD_GAP;
  const leftCandidate = point.x - CARD_WIDTH - CARD_GAP;
  const canFitRight = rightCandidate + CARD_WIDTH <= layout.width - SCREEN_MARGIN;
  const canFitLeft = leftCandidate >= LEFT_SAFE_MARGIN;

  const left = canFitRight
    ? rightCandidate
    : canFitLeft
      ? leftCandidate
      : clamp(
          point.x - CARD_WIDTH / 2,
          LEFT_SAFE_MARGIN,
          layout.width - CARD_WIDTH - SCREEN_MARGIN
        );

  return {
    left,
    top: clamp(
      point.y - CARD_HEIGHT / 2 + CARD_OFFSET_Y,
      SCREEN_MARGIN,
      layout.height - CARD_HEIGHT - SCREEN_MARGIN
    ),
  };
};

const PlaceholderMedia: React.FC<{ cue: WaypointMediaCue }> = ({ cue }) => {
  const initials = cue.title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, rgba(15, 86, 153, 0.94) 0%, rgba(7, 17, 31, 0.96) 54%, rgba(245, 158, 32, 0.84) 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 18,
          border: "1px solid rgba(255, 255, 255, 0.22)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          top: "50%",
          transform: "translateY(-50%)",
          color: colors.white,
          fontFamily: fonts.display,
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 0.9,
          letterSpacing: 0,
          opacity: 0.9,
          textAlign: "center",
        }}
      >
        {initials}
      </div>
    </div>
  );
};

const MediaFrame: React.FC<{ cue: WaypointMediaCue }> = ({ cue }) => {
  if (!cue.media) {
    return <PlaceholderMedia cue={cue} />;
  }

  if (cue.media.type === "image") {
    return (
      <Img
        src={staticFile(cue.media.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <OffthreadVideo
      src={staticFile(cue.media.src)}
      muted
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
};

export const WaypointMediaCallout: React.FC<WaypointMediaCalloutProps> = ({
  cue,
  point,
  progress,
  mediaStartFrame = 0,
}) => {
  const enter = interpolate(progress, [0, 0.22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(progress, [0.92, 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visibility = easeOutCubic(Math.min(enter, exit));
  const lineProgress = interpolate(visibility, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const card = resolveCardPosition(point);
  const cardCenter = {
    x: card.left + CARD_WIDTH / 2,
    y: card.top + CARD_HEIGHT / 2,
  };
  const cardOrigin = {
    x: point.x - card.left,
    y: point.y - card.top,
  };
  const cardScaleProgress = easeInOutCubic(visibility);
  const cardScale = interpolate(
    cardScaleProgress,
    [0, 0.84, 1],
    [0.08, 1.04, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const lineLength = Math.hypot(cardCenter.x - point.x, cardCenter.y - point.y);
  const lineAngle =
    (Math.atan2(cardCenter.y - point.y, cardCenter.x - point.x) * 180) /
    Math.PI;

  return (
    <AbsoluteOverlay>
      <div
        style={{
          position: "absolute",
          left: point.x - 22,
          top: point.y - 22,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: `3px solid ${cue.accentColor}`,
          boxShadow: `0 0 ${24 + visibility * 28}px ${cue.accentColor}`,
          opacity: visibility,
          transform: `scale(${0.5 + visibility * 0.8})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: point.x,
          top: point.y - 2,
          width: lineLength,
          height: 4,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${cue.accentColor}, rgba(255, 255, 255, 0.86))`,
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
          opacity: visibility,
          transform: `rotate(${lineAngle}deg) scaleX(${lineProgress})`,
          transformOrigin: "0 50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: card.left,
          top: card.top,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          background: "rgba(7, 17, 31, 0.88)",
          border: "1px solid rgba(255, 255, 255, 0.26)",
          boxShadow: "0 28px 70px rgba(0, 0, 0, 0.48)",
          overflow: "hidden",
          opacity: visibility,
          transform: `scale(${cardScale})`,
          transformOrigin: `${cardOrigin.x}px ${cardOrigin.y}px`,
        }}
      >
        <div style={{ height: MEDIA_HEIGHT, overflow: "hidden" }}>
          {cue.media ? (
            <Sequence from={mediaStartFrame} layout="none">
              <MediaFrame cue={cue} />
            </Sequence>
          ) : (
            <MediaFrame cue={cue} />
          )}
        </div>
        <div
          style={{
            height: TITLE_BAR_HEIGHT,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 24px",
            borderTop: `5px solid ${cue.accentColor}`,
            color: colors.white,
            fontFamily: fonts.display,
            fontSize: 29,
            fontWeight: 800,
            letterSpacing: 0,
            lineHeight: 1.08,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              flex: "0 0 auto",
              width: 12,
              height: 42,
              backgroundColor: cue.accentColor,
            }}
          />
          <span>{cue.title}</span>
        </div>
      </div>
    </AbsoluteOverlay>
  );
};

const AbsoluteOverlay: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 8,
    }}
  >
    {children}
  </div>
);
