import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  SEGMENTS,
  getStageTotalKm,
} from "../data/segments";
import { formatKm } from "../format";
import { colors, fonts } from "../theme";
import {
  bodyStyle,
  labelMicroStyle,
  labelStyle,
  unitStyle,
  valueStyle,
} from "../typography";
import { AnimatedBlock } from "./AnimatedBlock";

type Props = {
  stage: 1 | 2;
  durationFrames: number;
};

const ENTER_SECONDS = 0.5;
const EXIT_SECONDS = 0.55;
const START_SCALE = 0.965;

const StageStat: React.FC<{
  label: string;
  value: string;
  unit?: string;
}> = ({ label, value, unit }) => (
  <div
    style={{
      background: "rgba(0, 0, 0, 0.28)",
      padding: "22px 26px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 0,
    }}
  >
    <span style={labelMicroStyle}>{label}</span>
    <span
      style={{
        ...valueStyle,
        fontSize: 34,
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

  const exitStart = Math.max(0, durationFrames - Math.round(EXIT_SECONDS * fps));
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const enterProgress = interpolate(
    frame,
    [0, Math.round(ENTER_SECONDS * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const scale = START_SCALE + (1 - START_SCALE) * enterProgress;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: exitOpacity }}>
      <AbsoluteFill
        style={{
          opacity: enterProgress,
          backdropFilter: "blur(10px)",
          background:
            "radial-gradient(circle at 50% 46%, rgba(7, 17, 31, 0.34) 0%, rgba(7, 17, 31, 0.58) 56%, rgba(7, 17, 31, 0.76) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 96,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 820,
            transform: `scale(${scale})`,
            opacity: enterProgress,
            background: `linear-gradient(180deg, ${colors.panelBgTop}, ${colors.panelBgBottom})`,
            borderLeft: `6px solid ${colors.orange}`,
            boxShadow: `0 32px 90px ${colors.shadow}`,
            color: colors.white,
            fontFamily: fonts.display,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "52px 58px 42px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <AnimatedBlock delay={10} offsetY={18}>
              <div style={labelStyle}>Début d'étape</div>
            </AnimatedBlock>

            <AnimatedBlock delay={18} offsetY={18}>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: 112,
                  lineHeight: 0.95,
                  letterSpacing: 0,
                  color: colors.white,
                }}
              >
                Étape {stage}
              </div>
            </AnimatedBlock>

            <AnimatedBlock delay={30} offsetY={18}>
              <div
                style={{
                  ...bodyStyle,
                  fontSize: 26,
                  color: colors.whiteSubtle,
                }}
              >
                {firstSegment?.date}
              </div>
            </AnimatedBlock>
          </div>

          <AnimatedBlock delay={42} offsetY={18}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
              }}
            >
              <StageStat label="Spéciales" value={`${esCount} ES`} />
              <StageStat
                label="Kilomètres"
                value={formatKm(stageTotalKm)}
                unit="km"
              />
            </div>
          </AnimatedBlock>

          <div
            style={{
              height: 5,
              background: `linear-gradient(90deg, ${colors.orange}, rgba(245, 158, 32, 0))`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
