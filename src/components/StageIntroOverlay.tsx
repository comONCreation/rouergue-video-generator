import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  SEGMENTS,
  getStageTotalKm,
} from "../data/segments";
import {
  SHAKEDOWN_TIME_WINDOW,
  formatStageTitle,
  isShakedownStage,
} from "../rally.config";
import { formatKm } from "../format";
import { colors, fonts, stageIntro } from "../theme";
import {
  bodyStyle,
  labelMicroStyle,
  labelStyle,
  unitStyle,
  valueStyle,
} from "../typography";
import { AnimatedBlock } from "./AnimatedBlock";

type Props = {
  stage: number;
  durationFrames: number;
};

const StageStat: React.FC<{
  label: string;
  value: string;
  unit?: string;
}> = ({ label, value, unit }) => (
  <div
    style={{
      background: "rgba(0, 0, 0, 0.28)",
      padding: stageIntro.card.statPadding,
      display: "flex",
      flexDirection: "column",
      gap: stageIntro.card.statGap,
      minWidth: 0,
    }}
  >
    <span style={labelMicroStyle}>{label}</span>
    <span
      style={{
        ...valueStyle,
        fontSize: stageIntro.card.statValueFontSize,
        whiteSpace: "nowrap",
      }}
    >
      {value}
      {unit && <span style={unitStyle}>{unit}</span>}
    </span>
  </div>
);

export const StageIntroOverlay: React.FC<Props> = ({
  stage,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stageSegments = SEGMENTS.filter((segment) => segment.stage === stage);
  const esCount = stageSegments.filter((segment) => segment.type === "ES").length;
  const firstSegment = stageSegments[0];
  const stageTotalKm = getStageTotalKm(stage);
  const isShakedown = isShakedownStage(stage);

  const exitStart = Math.max(
    0,
    durationFrames - Math.round(stageIntro.card.exitSeconds * fps)
  );
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const enterProgress = interpolate(
    frame,
    [0, Math.round(stageIntro.card.enterSeconds * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const scale =
    stageIntro.card.startScale +
    (stageIntro.card.endScale - stageIntro.card.startScale) *
      enterProgress;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: exitOpacity }}>
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: stageIntro.card.padding,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: stageIntro.card.width,
            transform: `scale(${scale})`,
            opacity: enterProgress,
            background: `linear-gradient(180deg, ${colors.panelBgTop}, ${colors.panelBgBottom})`,
            borderLeft: `${stageIntro.card.borderWidth}px solid ${colors.orange}`,
            boxShadow: `${stageIntro.card.shadow} ${colors.shadow}`,
            color: colors.white,
            fontFamily: fonts.display,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: stageIntro.card.contentPadding,
              display: "flex",
              flexDirection: "column",
              gap: stageIntro.card.contentGap,
            }}
          >
            <AnimatedBlock
              delay={stageIntro.card.delays.label}
              offsetY={stageIntro.card.animationOffsetY}
            >
              <div style={labelStyle}>
                {isShakedown ? "Essais libres" : "Début d'étape"}
              </div>
            </AnimatedBlock>

            <AnimatedBlock
              delay={stageIntro.card.delays.title}
              offsetY={stageIntro.card.animationOffsetY}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: stageIntro.card.titleFontSize,
                  lineHeight: 0.95,
                  letterSpacing: 0,
                  color: colors.white,
                }}
              >
                {formatStageTitle(stage)}
              </div>
            </AnimatedBlock>

            <AnimatedBlock
              delay={stageIntro.card.delays.date}
              offsetY={stageIntro.card.animationOffsetY}
            >
              <div
                style={{
                  ...bodyStyle,
                  fontSize: stageIntro.card.dateFontSize,
                  color: colors.whiteSubtle,
                }}
              >
                {firstSegment?.date}
              </div>
            </AnimatedBlock>
          </div>

          <AnimatedBlock
            delay={stageIntro.card.delays.stats}
            offsetY={stageIntro.card.animationOffsetY}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: stageIntro.card.gridGap,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
              }}
            >
              <StageStat
                label={isShakedown ? "Créneau" : "Spéciales"}
                value={isShakedown ? SHAKEDOWN_TIME_WINDOW : `${esCount} ES`}
              />
              <StageStat
                label="Kilomètres"
                value={formatKm(stageTotalKm)}
                unit="km"
              />
            </div>
          </AnimatedBlock>

          <div
            style={{
              height: stageIntro.card.accentBarHeight,
              background: `linear-gradient(90deg, ${colors.orange}, rgba(245, 158, 32, 0))`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
